import type { AppData } from '../types/app'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const SYNC_KEY_STORAGE = 'bismillah-kelar-sync-key'
const DEVICE_ID_STORAGE = 'bismillah-kelar-device-id'
const DEVICE_NAME_STORAGE = 'bismillah-kelar-device-name'
const LAST_SYNCED_AT_STORAGE = 'bismillah-kelar-last-synced-at'
const PENDING_PUSH_STORAGE = 'bismillah-kelar-pending-push'

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

// 1. Membuat sesi QR dinamis (berlaku 60 detik) untuk perangkat baru yang ingin ditautkan
export async function createDynamicPairingSession(): Promise<{
  sessionCode: string
  expiresAt: number
}> {
  if (!isSupabaseConfigured()) {
    throw new Error('Konfigurasi Supabase (.env) belum diisi.')
  }

  const sessionCode = `PAIR-${generateSecureCode(6)}`
  const expiresAtMs = Date.now() + 60_000
  const expiresAtIso = new Date(expiresAtMs).toISOString()

  const response = await fetch(`${SUPABASE_URL}/rest/v1/pairing_sessions`, {
    method: 'POST',
    headers: getHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify({
      session_code: sessionCode,
      target_device_name: detectDeviceName(),
      status: 'pending',
      expires_at: expiresAtIso,
    }),
  })

  if (!response.ok) {
    throw new Error('Gagal membuat sesi QR sementara.')
  }

  return { sessionCode, expiresAt: expiresAtMs }
}

// 2. Mengecek apakah QR sesi kita sudah di-scan oleh perangkat utama
export async function pollPairingSession(
  sessionCode: string,
): Promise<PairingSessionRow | null> {
  if (!isSupabaseConfigured()) return null

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/pairing_sessions?session_code=eq.${encodeURIComponent(
      sessionCode,
    )}&select=*`,
    {
      method: 'GET',
      headers: getHeaders(),
    },
  )

  if (!response.ok) return null
  const rows = (await response.json()) as PairingSessionRow[]
  return rows[0] ?? null
}

// 3. Menghapus sesi QR setelah berhasil tertaut atau kedaluwarsa
export async function deletePairingSession(sessionCode: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  await fetch(
    `${SUPABASE_URL}/rest/v1/pairing_sessions?session_code=eq.${encodeURIComponent(
      sessionCode,
    )}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    },
  ).catch(() => {})
}

// 4. Dipanggil perangkat utama (misal HP) setelah berhasil scan QR / input kode perangkat baru
export async function approvePairingSession(
  rawScannedCode: string,
  currentData: AppData,
): Promise<{ syncKey: string; targetDevice: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Konfigurasi Supabase (.env) belum diisi.')
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

  const patchRes = await fetch(
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
  )

  if (!patchRes.ok) {
    throw new Error('Gagal menautkan perangkat tujuan.')
  }

  return {
    syncKey,
    targetDevice: session.target_device_name || 'Perangkat Baru',
  }
}

// 5. Upload data lokal ke cloud
export async function pushDataToCloud(
  syncKey: string,
  payload: AppData,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi.')
  }

  const nowIso = new Date().toISOString()

  const response = await fetch(`${SUPABASE_URL}/rest/v1/user_sync_data`, {
    method: 'POST',
    headers: getHeaders({
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({
      sync_key: syncKey,
      payload,
      updated_at: nowIso,
      updated_by_device: detectDeviceName(),
    }),
  })

  if (!response.ok) {
    throw new Error('Gagal mengunggah data ke cloud.')
  }

  localStorage.setItem(LAST_SYNCED_AT_STORAGE, nowIso)
  localStorage.removeItem(PENDING_PUSH_STORAGE)
  return nowIso
}

// 6. Download data terbaru dari cloud
export async function pullDataFromCloud(
  syncKey: string,
): Promise<{ payload: AppData; updatedAt: string } | null> {
  if (!isSupabaseConfigured()) return null

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_sync_data?sync_key=eq.${encodeURIComponent(
      syncKey,
    )}&select=payload,updated_at`,
    {
      method: 'GET',
      headers: getHeaders(),
    },
  )

  if (!response.ok) {
    throw new Error('Gagal mengambil data dari cloud.')
  }

  const rows = (await response.json()) as {
    payload: AppData
    updated_at: string
  }[]

  if (!rows[0]) return null

  localStorage.setItem(LAST_SYNCED_AT_STORAGE, rows[0].updated_at)
  localStorage.removeItem(PENDING_PUSH_STORAGE)

  return {
    payload: rows[0].payload,
    updatedAt: rows[0].updated_at,
  }
}