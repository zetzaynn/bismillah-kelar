import type { AppData } from '../types/app'
import {
  deleteTimerSound,
  getProfilePhoto,
  getTimerSound,
  saveProfilePhoto,
  saveTimerSound,
} from './audioStorage'

const SUPABASE_URL = 'https://mpdumvqbibevxtfzdudl.supabase.co'
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

const SYNC_KEY_STORAGE = 'bismillah-kelar-sync-key'
const DEVICE_ID_STORAGE = 'bismillah-kelar-device-id'
const DEVICE_NAME_STORAGE = 'bismillah-kelar-device-name'
const LAST_SYNCED_AT_STORAGE = 'bismillah-kelar-last-synced-at'
const PENDING_PUSH_STORAGE = 'bismillah-kelar-pending-push'
const LAST_MEDIA_HASH_STORAGE = 'bismillah-kelar-last-media-hash'

export interface SyncMetadata {
  syncKey: string | null
  deviceId: string
  deviceName: string
  lastSyncedAt: string | null
  hasPendingPush: boolean
  isConfigured: boolean
}

export interface PairingSessionRow {
  session_code: string
  sync_key: string | null
  target_device_name: string | null
  status: 'pending' | 'claimed'
  expires_at: string
}

interface SyncedMediaBundle {
  profilePhotoBase64?: string | null
  profilePhotoType?: string | null
  customSoundBase64?: string | null
  customSoundName?: string | null
  customSoundType?: string | null
}

type CloudPayloadEnvelope = AppData & {
  __syncedMedia?: SyncedMediaBundle
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

function getHeaders(extra?: Record<string, string>) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 25_000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Koneksi ke server Supabase lambat/timeout. Pastikan proyek Supabase aktif & internet stabil.',
      )
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}

function generateSecureCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => chars[byte % chars.length]).join('')
}

export function detectDeviceName(): string {
  const existing = localStorage.getItem(DEVICE_NAME_STORAGE)
  if (existing) return existing

  const ua = navigator.userAgent
  let label = 'Perangkat Web'

  if (/Android/i.test(ua)) label = 'HP Android'
  else if (/iPhone|iPad/i.test(ua)) label = 'iPhone / iPad'
  else if (/Windows/i.test(ua)) label = 'Laptop Windows'
  else if (/Macintosh/i.test(ua)) label = 'MacBook / Mac'
  else if (/Linux/i.test(ua)) label = 'Laptop Linux'

  localStorage.setItem(DEVICE_NAME_STORAGE, label)
  return label
}

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_STORAGE)
  if (!id) {
    id = `DEV-${generateSecureCode(10)}`
    localStorage.setItem(DEVICE_ID_STORAGE, id)
  }
  return id
}

export function getSyncMetadata(): SyncMetadata {
  return {
    syncKey: localStorage.getItem(SYNC_KEY_STORAGE),
    deviceId: getOrCreateDeviceId(),
    deviceName: detectDeviceName(),
    lastSyncedAt: localStorage.getItem(LAST_SYNCED_AT_STORAGE),
    hasPendingPush: localStorage.getItem(PENDING_PUSH_STORAGE) === 'true',
    isConfigured: isSupabaseConfigured(),
  }
}

export function setSyncKey(key: string | null) {
  if (key) {
    localStorage.setItem(SYNC_KEY_STORAGE, key.trim().toUpperCase())
  } else {
    localStorage.removeItem(SYNC_KEY_STORAGE)
    localStorage.removeItem(LAST_SYNCED_AT_STORAGE)
    localStorage.removeItem(PENDING_PUSH_STORAGE)
    localStorage.removeItem(LAST_MEDIA_HASH_STORAGE)
  }
}

export function ensureSyncKey(): string {
  const existing = localStorage.getItem(SYNC_KEY_STORAGE)
  if (existing) return existing

  const newKey = `BK-${generateSecureCode(4)}-${generateSecureCode(4)}-${generateSecureCode(4)}`
  setSyncKey(newKey)
  return newKey
}

export function markPendingLocalChange() {
  if (!localStorage.getItem(SYNC_KEY_STORAGE)) return
  localStorage.setItem(PENDING_PUSH_STORAGE, 'true')
}

// Kompres foto profil menjadi ringan (~25 KB) sebelum dikirim ke cloud
function compressImageToDataUrl(blob: Blob, maxDim = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas tidak tersedia'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gagal memproses gambar'))
    }
    img.src = url
  })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Gagal membaca file media.'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function base64ToBlob(dataUrl: string, fallbackType: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return blob.type ? blob : new Blob([blob], { type: fallbackType })
}

async function packLocalMedia(): Promise<SyncedMediaBundle> {
  const bundle: SyncedMediaBundle = {
    profilePhotoBase64: null,
    profilePhotoType: null,
    customSoundBase64: null,
    customSoundName: null,
    customSoundType: null,
  }

  try {
    const photoBlob = await getProfilePhoto()
    if (photoBlob) {
      bundle.profilePhotoBase64 = await compressImageToDataUrl(photoBlob, 256)
      bundle.profilePhotoType = 'image/jpeg'
    }
  } catch {
    // Abaikan jika foto gagal dikompresi
  }

  try {
    const soundRecord = await getTimerSound()
    // Batasi MP3 sinkronisasi maksimal 1.5 MB agar tidak timeout di mobile
    if (soundRecord?.blob && soundRecord.blob.size <= 1.5 * 1024 * 1024) {
      bundle.customSoundBase64 = await blobToBase64(soundRecord.blob)
      bundle.customSoundName = soundRecord.name
      bundle.customSoundType = soundRecord.blob.type || 'audio/mpeg'
    }
  } catch {
    // Abaikan jika audio gagal dibaca
  }

  return bundle
}

async function unpackRemoteMedia(bundle?: SyncedMediaBundle): Promise<boolean> {
  if (!bundle) return false
  let photoUpdated = false

  try {
    if (bundle.profilePhotoBase64) {
      const photoBlob = await base64ToBlob(
        bundle.profilePhotoBase64,
        bundle.profilePhotoType || 'image/jpeg',
      )
      const photoFile = new File([photoBlob], 'synced-profile-photo.jpg', {
        type: bundle.profilePhotoType || 'image/jpeg',
      })
      await saveProfilePhoto(photoFile)
      photoUpdated = true
    }
  } catch {
    // Abaikan jika gagal menyimpan foto ke IndexedDB
  }

  try {
    if (bundle.customSoundBase64 && bundle.customSoundName) {
      const soundBlob = await base64ToBlob(
        bundle.customSoundBase64,
        bundle.customSoundType || 'audio/mpeg',
      )
      const file = new File([soundBlob], bundle.customSoundName, {
        type: bundle.customSoundType || 'audio/mpeg',
      })
      await saveTimerSound(file)
    } else if (bundle.customSoundBase64 === null) {
      await deleteTimerSound()
    }
  } catch {
    // Abaikan jika gagal menyimpan MP3 ke IndexedDB
  }

  return photoUpdated
}

// 1. Membuat sesi QR dinamis (berlaku 60 detik)
export async function createDynamicPairingSession(): Promise<{
  sessionCode: string
  expiresAt: number
}> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Variabel VITE_SUPABASE_ANON_KEY belum terbaca. Periksa pengaturan Vercel.',
    )
  }

  const sessionCode = `PAIR-${generateSecureCode(6)}`
  const expiresAtMs = Date.now() + 60_000
  const expiresAtIso = new Date(expiresAtMs).toISOString()

  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/rest/v1/pairing_sessions`,
    {
      method: 'POST',
      headers: getHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        session_code: sessionCode,
        target_device_name: detectDeviceName(),
        status: 'pending',
        expires_at: expiresAtIso,
      }),
    },
    20_000,
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Supabase error (${response.status}): ${detail || 'Tabel pairing_sessions belum siap.'}`,
    )
  }

  return { sessionCode, expiresAt: expiresAtMs }
}

// 2. Mengecek apakah QR sesi kita sudah di-scan oleh perangkat utama
export async function pollPairingSession(
  sessionCode: string,
): Promise<PairingSessionRow | null> {
  if (!isSupabaseConfigured()) return null

  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/rest/v1/pairing_sessions?session_code=eq.${encodeURIComponent(
      sessionCode,
    )}&select=*`,
    {
      method: 'GET',
      headers: getHeaders(),
    },
    10_000,
  ).catch(() => null)

  if (!response || !response.ok) return null
  const rows = (await response.json()) as PairingSessionRow[]
  return rows[0] ?? null
}

// 3. Menghapus sesi QR setelah berhasil tertaut atau kedaluwarsa
export async function deletePairingSession(sessionCode: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  await fetchWithTimeout(
    `${SUPABASE_URL}/rest/v1/pairing_sessions?session_code=eq.${encodeURIComponent(
      sessionCode,
    )}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    },
    8_000,
  ).catch(() => {})
}

// 4. Dipanggil perangkat utama setelah berhasil scan QR / input kode
export async function approvePairingSession(
  rawScannedCode: string,
  currentData: AppData,
): Promise<{ syncKey: string; targetDevice: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Konfigurasi Supabase belum diisi.')
  }

  const cleaned = rawScannedCode.trim().toUpperCase()
  const sessionCode = cleaned.startsWith('PAIR-')
    ? cleaned
    : `PAIR-${cleaned}`

  const session = await pollPairingSession(sessionCode)
  if (!session) {
    throw new Error('Kode QR tidak ditemukan atau sudah kedaluwarsa.')
  }

  if (session.status !== 'pending') {
    throw new Error('Kode QR ini sudah pernah digunakan.')
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await deletePairingSession(sessionCode)
    throw new Error('Kode QR sudah kedaluwarsa (melewati 60 detik).')
  }

  const syncKey = ensureSyncKey()
  await pushDataToCloud(syncKey, currentData)

  const patchRes = await fetchWithTimeout(
    `${SUPABASE_URL}/rest/v1/pairing_sessions?session_code=eq.${encodeURIComponent(
      sessionCode,
    )}`,
    {
      method: 'PATCH',
      headers: getHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        sync_key: syncKey,
        status: 'claimed',
      }),
    },
    15_000,
  )

  if (!patchRes.ok) {
    throw new Error('Gagal menautkan perangkat tujuan.')
  }

  return {
    syncKey,
    targetDevice: session.target_device_name || 'Perangkat Baru',
  }
}

// 5. Upload data lokal + media ringan ke cloud
export async function pushDataToCloud(
  syncKey: string,
  payload: AppData,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.')
  }

  const nowIso = new Date().toISOString()
  const mediaBundle = await packLocalMedia()
  const envelope: CloudPayloadEnvelope = {
    ...payload,
    __syncedMedia: mediaBundle,
  }

  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/rest/v1/user_sync_data`,
    {
      method: 'POST',
      headers: getHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        sync_key: syncKey,
        payload: envelope,
        updated_at: nowIso,
        updated_by_device: detectDeviceName(),
      }),
    },
    25_000,
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Gagal mengunggah (${response.status}): ${detail}`)
  }

  localStorage.setItem(LAST_SYNCED_AT_STORAGE, nowIso)
  localStorage.removeItem(PENDING_PUSH_STORAGE)
  return nowIso
}

// 6. Download data terbaru dari cloud
export async function pullDataFromCloud(
  syncKey: string,
  force: boolean = false,
): Promise<{
  payload: AppData
  updatedAt: string
  mediaUpdated: boolean
} | null> {
  if (!isSupabaseConfigured()) return null

  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/rest/v1/user_sync_data?sync_key=eq.${encodeURIComponent(
      syncKey,
    )}&select=payload,updated_at`,
    {
      method: 'GET',
      headers: getHeaders(),
    },
    25_000,
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Gagal mengambil data (${response.status}): ${detail}`)
  }

  const rows = (await response.json()) as {
    payload: CloudPayloadEnvelope
    updated_at: string
  }[]

  if (!rows[0]) return null

  const lastLocalSync = localStorage.getItem(LAST_SYNCED_AT_STORAGE)
  if (!force && lastLocalSync && rows[0].updated_at <= lastLocalSync) {
    return null
  }

  const { __syncedMedia, ...cleanAppData } = rows[0].payload
  const mediaUpdated = await unpackRemoteMedia(__syncedMedia)

  localStorage.setItem(LAST_SYNCED_AT_STORAGE, rows[0].updated_at)
  localStorage.removeItem(PENDING_PUSH_STORAGE)

  return {
    payload: cleanAppData as AppData,
    updatedAt: rows[0].updated_at,
    mediaUpdated,
  }
}