import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  Check,
  Laptop,
  Link2,
  LoaderCircle,
  QrCode,
  RefreshCw,
  Smartphone,
  Unlink,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'

import {
  approvePairingSession,
  createDynamicPairingSession,
  deletePairingSession,
  getSyncMetadata,
  pollPairingSession,
  pullDataFromCloud,
  setSyncKey,
  type SyncMetadata,
} from '../../lib/cloudSync'
import type { AppData } from '../../types/app'

interface LinkedDevicesModalProps {
  isOpen: boolean
  onClose: () => void
  currentData: AppData
  onApplySyncedData: (newData: AppData) => void
  onSyncNow: () => Promise<void>
  isSyncing: boolean
  isOnline: boolean
}

type ModalTab = 'scan' | 'show-qr'

export default function LinkedDevicesModal({
  isOpen,
  onClose,
  currentData,
  onApplySyncedData,
  onSyncNow,
  isSyncing,
  isOnline,
}: LinkedDevicesModalProps) {
  const [tab, setTab] = useState<ModalTab>('show-qr')
  const [meta, setMeta] = useState<SyncMetadata>(() => getSyncMetadata())

  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [, setExpiresAt] = useState<number>(0)
  const [secondsLeft, setSecondsLeft] = useState<number>(60)
  const [qrLoading, setQrLoading] = useState(false)

  const [cameraActive, setCameraActive] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [claiming, setClaiming] = useState(false)

  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const sessionCodeRef = useRef<string | null>(null)
  sessionCodeRef.current = sessionCode

  const refreshMeta = () => setMeta(getSyncMetadata())

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch {
        // Abaikan error saat menghentikan kamera
      } finally {
        scannerRef.current = null
        setCameraActive(false)
      }
    }
  }

  const generateNewQrSession = async () => {
    if (!isOnline) {
      setStatusMsg({
        type: 'error',
        text: 'Perangkat sedang offline. Sambungkan internet untuk membuat QR tautan.',
      })
      return
    }

    setQrLoading(true)
    setStatusMsg(null)

    try {
      if (sessionCodeRef.current) {
        await deletePairingSession(sessionCodeRef.current)
      }

      const created = await createDynamicPairingSession()
      setSessionCode(created.sessionCode)
      setExpiresAt(created.expiresAt)
      setSecondsLeft(60)
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuat QR.',
      })
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      void stopCamera()
      if (sessionCodeRef.current) {
        void deletePairingSession(sessionCodeRef.current)
        setSessionCode(null)
      }
      setStatusMsg(null)
      setManualCode('')
      return
    }

    refreshMeta()
    const currentMeta = getSyncMetadata()
    setTab(currentMeta.syncKey ? 'scan' : 'show-qr')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || tab !== 'show-qr') return

    void generateNewQrSession()

    const countdownInterval = window.setInterval(() => {
      setExpiresAt((currentExp) => {
        if (!currentExp) return 0
        const remaining = Math.max(
          0,
          Math.ceil((currentExp - Date.now()) / 1000),
        )
        setSecondsLeft(remaining)

        if (remaining === 0) {
          void generateNewQrSession()
        }
        return currentExp
      })
    }, 1000)

    const pollInterval = window.setInterval(async () => {
      const code = sessionCodeRef.current
      if (!code) return

      const row = await pollPairingSession(code)
      if (row && row.status === 'claimed' && row.sync_key) {
        window.clearInterval(pollInterval)
        window.clearInterval(countdownInterval)

        setSyncKey(row.sync_key)
        await deletePairingSession(code)
        setSessionCode(null)

        try {
          const pulled = await pullDataFromCloud(row.sync_key, true)
          if (pulled?.payload) {
            onApplySyncedData(pulled.payload)
          }
          refreshMeta()
          setStatusMsg({
            type: 'success',
            text: 'Perangkat berhasil tertaut dan data telah disinkronkan!',
          })
        } catch {
          refreshMeta()
          setStatusMsg({
            type: 'success',
            text: 'Perangkat tertaut! Data akan otomatis disinkronkan.',
          })
        }
      }
    }, 2000)

    return () => {
      window.clearInterval(countdownInterval)
      window.clearInterval(pollInterval)
    }
  }, [isOpen, tab])

  useEffect(() => {
    if (tab !== 'scan') {
      void stopCamera()
    }
  }, [tab])

  const handleClaimCode = async (rawCode: string) => {
    if (!rawCode.trim() || claiming) return
    setClaiming(true)
    setStatusMsg(null)

    try {
      await stopCamera()
      const result = await approvePairingSession(rawCode, currentData)
      refreshMeta()
      setManualCode('')
      setStatusMsg({
        type: 'success',
        text: `Berhasil menautkan dengan ${result.targetDevice}!`,
      })
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menautkan perangkat.',
      })
    } finally {
      setClaiming(false)
    }
  }

  const startCameraScanner = async () => {
    setStatusMsg(null)
    setCameraActive(true)

    window.setTimeout(async () => {
      try {
        const html5Qr = new Html5Qrcode('qr-reader')
        scannerRef.current = html5Qr

        await html5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            void handleClaimCode(decodedText)
          },
          () => {},
        )
      } catch {
        setCameraActive(false)
        setStatusMsg({
          type: 'error',
          text: 'Kamera tidak dapat diakses. Gunakan input kode singkat di bawah QR.',
        })
      }
    }, 100)
  }

  const handleUnlink = () => {
    setSyncKey(null)
    refreshMeta()
    setStatusMsg({
      type: 'success',
      text: 'Tautan perangkat diputus. Data lokal di perangkat ini tetap aman.',
    })
  }

  if (!isOpen) return null

  const shortDisplayCode = sessionCode
    ? sessionCode.replace(/^PAIR-/, '')
    : '------'

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto bg-[#252525]/45 px-4 py-6 backdrop-blur-sm sm:items-center"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Perangkat Tertaut"
        onClick={(e) => e.stopPropagation()}
        className="my-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#252525] bg-[#93C5FD]">
              <Link2 size={20} className="text-[#252525]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#252525]">
                Perangkat Tertaut
              </h2>
              <p className="text-[11px] text-[#77716a]">
                Sinkronisasi otomatis offline-first antar perangkat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-xl bg-[#f1ede6] p-2 hover:bg-[#e5dfd3]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border-2 border-[#252525] bg-[#93C5FD]/45 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#252525] bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-[#1e3a8a]">
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? 'Online • Siap Sinkron' : 'Offline • Tersimpan Lokal'}
            </span>

            {meta.syncKey ? (
              <span className="rounded-full border border-[#252525] bg-[#4ADE80] px-2.5 py-0.5 text-[10px] font-extrabold text-[#14532d]">
                Tertaut
              </span>
            ) : (
              <span className="rounded-full border border-[#252525] bg-[#FFE69A] px-2.5 py-0.5 text-[10px] font-extrabold text-[#252525]">
                Belum Tertaut
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-2.5 text-xs">
            {/Android|iPhone/i.test(meta.deviceName) ? (
              <Smartphone size={16} className="shrink-0 text-[#1e3a8a]" />
            ) : (
              <Laptop size={16} className="shrink-0 text-[#1e3a8a]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-[#252525]">
                {meta.deviceName}
              </p>
              <p className="text-[11px] text-[#334155]">
                {meta.lastSyncedAt
                  ? `Sinkron terakhir: ${new Date(
                      meta.lastSyncedAt,
                    ).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} WIB${meta.hasPendingPush ? ' (menunggu internet...)' : ''}`
                  : 'Belum pernah disinkronkan ke cloud'}
              </p>
            </div>
          </div>

          {meta.syncKey && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={!isOnline || isSyncing}
                onClick={async () => {
                  await onSyncNow()
                  refreshMeta()
                  setStatusMsg({
                    type: 'success',
                    text: 'Data berhasil disinkronkan.',
                  })
                }}
                className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-[1.5px] border-[#252525] bg-[#93C5FD] px-3 py-2.5 text-xs font-extrabold text-[#252525] shadow-[2px_2px_0_#252525] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={`shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
              </button>

              <button
                type="button"
                onClick={handleUnlink}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-[1.5px] border-[#252525] bg-white px-3.5 py-2.5 text-xs font-bold text-[#991b1b] hover:bg-[#fee2e2]"
                title="Putuskan tautan perangkat ini"
              >
                <Unlink size={14} className="shrink-0" />
                <span>Putus</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setStatusMsg(null)
              setTab('show-qr')
            }}
            className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-[#252525] px-3 py-2.5 text-xs font-extrabold transition ${
              tab === 'show-qr'
                ? 'bg-[#93C5FD] text-[#252525] shadow-[2px_2px_0_#252525]'
                : 'bg-white text-[#64748b] hover:bg-[#f5f0e7]'
            }`}
          >
            <QrCode size={15} className="shrink-0" />
            <span>Tampilkan QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusMsg(null)
              setTab('scan')
            }}
            className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-[#252525] px-3 py-2.5 text-xs font-extrabold transition ${
              tab === 'scan'
                ? 'bg-[#93C5FD] text-[#252525] shadow-[2px_2px_0_#252525]'
                : 'bg-white text-[#64748b] hover:bg-[#f5f0e7]'
            }`}
          >
            <Camera size={15} className="shrink-0" />
            <span>Scan QR</span>
          </button>
        </div>

        {tab === 'show-qr' && (
          <div className="mt-4 rounded-2xl border-2 border-[#252525] bg-white p-4 text-center shadow-[3px_3px_0_#252525]">
            <p className="text-xs font-bold text-[#252525]">
              Scan QR ini dari perangkat yang sudah memiliki data
            </p>
            <p className="mt-0.5 text-[11px] text-[#77716a]">
              QR otomatis diperbarui setiap 60 detik demi keamanan
            </p>

            <div className="mx-auto mt-3.5 flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-3">
              {qrLoading || !sessionCode ? (
                <LoaderCircle
                  size={28}
                  className="animate-spin text-[#1e3a8a]"
                />
              ) : (
                <QRCodeSVG
                  value={sessionCode}
                  size={176}
                  bgColor="#fffaf1"
                  fgColor="#252525"
                  level="M"
                />
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="rounded-lg border border-[#252525] bg-[#93C5FD]/50 px-2.5 py-1 font-mono text-xs font-extrabold tracking-widest text-[#252525]">
                {shortDisplayCode}
              </span>

              <span className="rounded-lg border border-[#252525] bg-[#FFE69A] px-2.5 py-1 text-[11px] font-extrabold text-[#252525] tabular-nums">
                {secondsLeft}d
              </span>

              <button
                type="button"
                onClick={() => void generateNewQrSession()}
                disabled={qrLoading}
                aria-label="Buat ulang QR"
                className="rounded-lg border border-[#252525] bg-[#f5f0e7] p-1.5 hover:bg-[#93C5FD]"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        )}

        {tab === 'scan' && (
          <div className="mt-4 space-y-3 rounded-2xl border-2 border-[#252525] bg-white p-4 shadow-[3px_3px_0_#252525]">
            <p className="text-xs font-bold text-[#252525]">
              Arahkan kamera ke QR di perangkat tujuan
            </p>

            {!cameraActive ? (
              <button
                type="button"
                onClick={() => void startCameraScanner()}
                disabled={claiming || !isOnline}
                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-[#252525] bg-[#93C5FD] py-3 text-xs font-extrabold text-[#252525] shadow-[3px_3px_0_#252525] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              >
                <Camera size={16} className="shrink-0" />
                <span>Buka Kamera Scan QR</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div
                  id="qr-reader"
                  className="overflow-hidden rounded-xl border-2 border-[#252525]"
                />
                <button
                  type="button"
                  onClick={() => void stopCamera()}
                  className="w-full rounded-xl border border-[#252525] bg-[#f5f0e7] py-2 text-xs font-bold"
                >
                  Tutup Kamera
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <div className="h-px flex-1 bg-[#e5ddd1]" />
              <span className="text-[10px] font-bold uppercase text-[#888078]">
                atau masukkan kode 6 digit
              </span>
              <div className="h-px flex-1 bg-[#e5ddd1]" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={12}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Contoh: 9X4K2P"
                className="min-w-0 flex-1 rounded-xl border-2 border-[#252525] bg-[#fffaf1] px-3 py-2.5 font-mono text-xs font-extrabold uppercase tracking-wider outline-none focus:bg-white"
              />
              <button
                type="button"
                disabled={!manualCode.trim() || claiming || !isOnline}
                onClick={() => void handleClaimCode(manualCode)}
                className="flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border-2 border-[#252525] bg-[#93C5FD] px-4 py-2.5 text-xs font-extrabold text-[#252525] shadow-[2px_2px_0_#252525] disabled:opacity-50"
              >
                {claiming ? (
                  <LoaderCircle size={14} className="shrink-0 animate-spin" />
                ) : (
                  <Check size={14} className="shrink-0" />
                )}
                <span>Tautkan</span>
              </button>
            </div>
          </div>
        )}

        {statusMsg && (
          <p
            className={`mt-3 rounded-xl border px-3 py-2.5 text-xs font-bold ${
              statusMsg.type === 'success'
                ? 'border-[#252525] bg-[#BDECCF] text-[#14532d]'
                : 'border-[#252525] bg-[#FFB5A7] text-[#5f160c]'
            }`}
          >
            {statusMsg.text}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}