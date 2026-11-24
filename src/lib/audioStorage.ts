const DB_NAME = 'bismillah-kelar-audio'
const STORE_NAME = 'sounds'
const SOUND_KEY = 'timer-end'
const PROFILE_PHOTO_KEY = 'profile-photo'

export const DEFAULT_ALARM_TONE_KEY = 'bismillah-kelar-default-alarm-tone'

export type DefaultToneId = 'tone-1' | 'tone-2' | 'tone-3'
export type SelectedToneId = DefaultToneId | 'custom'

export const DEFAULT_ALARM_TONES: Record<
  DefaultToneId,
  { id: DefaultToneId; name: string; url: string }
> = {
  'tone-1': {
    id: 'tone-1',
    name: 'Your Phone Linging',
    url: `${import.meta.env.BASE_URL}audio/the-phone-lingering.mp3`,
  },
  'tone-2': {
    id: 'tone-2',
    name: '#jedagjedug - Zachz Winner',
    url: `${import.meta.env.BASE_URL}audio/jedagjedug-zachzwinner.mp3`,
  },
  'tone-3': {
    id: 'tone-3',
    name: 'MONTAGEM XONADA - TheGoodVibe',
    url: `${import.meta.env.BASE_URL}audio/phonk-montagem-xonada.mp3`,
  },
}

export const DEFAULT_TIMER_SOUND_NAME = DEFAULT_ALARM_TONES['tone-1'].name
export const DEFAULT_TIMER_SOUND_URL = DEFAULT_ALARM_TONES['tone-1'].url

export function isCustomTimerSoundSelected(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return localStorage.getItem(DEFAULT_ALARM_TONE_KEY) === 'custom'
}

export function getSelectedDefaultTimerSound(): {
  id: DefaultToneId
  name: string
  url: string
} {
  if (typeof window === 'undefined') {
    return DEFAULT_ALARM_TONES['tone-1']
  }

  const saved = localStorage.getItem(DEFAULT_ALARM_TONE_KEY)
  if (saved === 'tone-2' || saved === 'tone-3') {
    return DEFAULT_ALARM_TONES[saved]
  }

  return DEFAULT_ALARM_TONES['tone-1']
}

export interface TimerSound {
  name: string
  blob: Blob
}

// Elemen audio tunggal yang di-unlock saat user klik Mulai agar tetap bisa berbunyi di latar belakang.
let alarmAudio: HTMLAudioElement | null = null
let activeAudioUrl: string | null = null
let playbackCallback: ((playing: boolean) => void) | null = null
let isAlarmPlaying = false

// Mencegah audio lama diputar setelah perintah stop atau pemutaran baru.
let playbackGeneration = 0

// Audio sunyi (0 amplitudo) untuk menjaga proses timer tetap aktif saat keluar dari aplikasi di HP.
let keepAliveAudio: HTMLAudioElement | null = null
let keepAliveWavUrl: string | null = null

function getSilentWavUrl(): string {
  if (keepAliveWavUrl) return keepAliveWavUrl

  const sampleRate = 8000
  const numSamples = sampleRate // 1 detik sunyi
  const dataSize = numSamples
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM
  view.setUint16(20, 1, true) // Linear PCM
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true) // 8-bit
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  // 0x80 adalah titik tengah (hening total) pada PCM 8-bit unsigned.
  new Uint8Array(buffer, 44).fill(0x80)

  const blob = new Blob([buffer], { type: 'audio/wav' })
  keepAliveWavUrl = URL.createObjectURL(blob)
  return keepAliveWavUrl
}

export function startBackgroundTimerKeepAlive(
  mode: 'focus' | 'break',
): void {
  if (typeof window === 'undefined') return

  try {
    if (!keepAliveAudio) {
      keepAliveAudio = new Audio(getSilentWavUrl())
      keepAliveAudio.loop = true
      keepAliveAudio.preload = 'auto'
    }

    keepAliveAudio.volume = 0.01

    if (keepAliveAudio.paused) {
      void keepAliveAudio.play().catch(() => {})
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:
          mode === 'focus'
            ? 'Sesi Fokus Berjalan'
            : 'Waktu Istirahat Berjalan',
        artist: 'Bismillah Kelar',
        album: 'Timer Produktivitas',
      })
      navigator.mediaSession.playbackState = 'playing'
    }
  } catch {
    // Abaikan jika perangkat membatasi MediaSession.
  }
}

export function stopBackgroundTimerKeepAlive(): void {
  try {
    if (keepAliveAudio) {
      keepAliveAudio.pause()
      keepAliveAudio.currentTime = 0
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none'
    }
  } catch {
    // Abaikan error saat menghentikan keep-alive.
  }
}

function getOrCreateAlarmAudio(): HTMLAudioElement {
  if (!alarmAudio) {
    alarmAudio = new Audio()
    alarmAudio.preload = 'auto'
  }
  return alarmAudio
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => {
      const db = request.result

      db.onversionchange = () => {
        db.close()
      }

      resolve(db)
    }

    request.onerror = () => reject(request.error)
    request.onblocked = () =>
      reject(new Error('Akses penyimpanan IndexedDB sedang diblokir.'))
  })
}

export async function saveTimerSound(file: File): Promise<void> {
  const db = await openAudioDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).put(
      {
        name: file.name,
        blob: file,
      },
      SOUND_KEY,
    )

    transaction.oncomplete = () => {
      db.close()
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEFAULT_ALARM_TONE_KEY, 'custom')
      }
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(
        transaction.error ??
          new Error('Transaksi penyimpanan audio dibatalkan.'),
      )
    }
  })
}

export async function getTimerSound(): Promise<TimerSound | null> {
  const db = await openAudioDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(SOUND_KEY)

    request.onsuccess = () => {
      const result = request.result as Partial<TimerSound> | undefined
      db.close()

      if (
        result &&
        typeof result.name === 'string' &&
        result.blob instanceof Blob
      ) {
        resolve({
          name: result.name,
          blob: result.blob,
        })
        return
      }

      resolve(null)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(
        transaction.error ?? new Error('Pembacaan audio dibatalkan.'),
      )
    }
  })
}

export async function deleteTimerSound(): Promise<void> {
  stopTimerEndSound()

  const db = await openAudioDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).delete(SOUND_KEY)

    transaction.oncomplete = () => {
      db.close()
      if (
        typeof window !== 'undefined' &&
        localStorage.getItem(DEFAULT_ALARM_TONE_KEY) === 'custom'
      ) {
        localStorage.setItem(DEFAULT_ALARM_TONE_KEY, 'tone-1')
      }
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(
        transaction.error ?? new Error('Penghapusan audio dibatalkan.'),
      )
    }
  })
}

// Membuka izin autoplay elemen audio sesuai nada pilihan aktif (MP3 kustom atau salah satu dari 3 nada default).
export async function primeTimerEndSound(): Promise<void> {
  if (typeof window === 'undefined' || isAlarmPlaying) return

  try {
    const audio = getOrCreateAlarmAudio()
    const useCustom = isCustomTimerSoundSelected()

    let customSound: TimerSound | null = null
    if (useCustom) {
      try {
        customSound = await getTimerSound()
      } catch {
        customSound = null
      }
    }

    if (isAlarmPlaying) return

    if (activeAudioUrl) {
      URL.revokeObjectURL(activeAudioUrl)
      activeAudioUrl = null
    }

    if (useCustom && customSound) {
      const blobUrl = URL.createObjectURL(customSound.blob)
      activeAudioUrl = blobUrl
      audio.src = blobUrl
    } else {
      audio.src = getSelectedDefaultTimerSound().url
    }

    audio.loop = false
    audio.muted = true
    await audio.play()
    audio.pause()
    audio.currentTime = 0
    audio.muted = false
  } catch {
    if (alarmAudio) {
      alarmAudio.muted = false
    }
  }
}

export function stopTimerEndSound(): void {
  // Membatalkan semua proses pemutaran yang masih tertunda.
  playbackGeneration += 1
  isAlarmPlaying = false

  if (alarmAudio) {
    alarmAudio.loop = false
    alarmAudio.onended = null
    alarmAudio.onerror = null
    alarmAudio.pause()
    alarmAudio.currentTime = 0
    alarmAudio.muted = false
  }

  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl)
    activeAudioUrl = null
  }

  const callback = playbackCallback
  playbackCallback = null
  callback?.(false)
}

export async function playTimerEndSound(
  volume: number = 1,
  onPlaybackChange?: (playing: boolean) => void,
  loop: boolean = false,
): Promise<boolean> {
  stopTimerEndSound()

  const currentGeneration = playbackGeneration

  try {
    const useCustom = isCustomTimerSoundSelected()
    let customSound: TimerSound | null = null

    if (useCustom) {
      try {
        customSound = await getTimerSound()
      } catch {
        customSound = null
      }
    }

    // Jangan lanjutkan jika sudah ada perintah stop atau pemutaran baru.
    if (currentGeneration !== playbackGeneration) {
      return false
    }

    const audio = getOrCreateAlarmAudio()
    const isBlobUrl = Boolean(useCustom && customSound)
    const sourceUrl =
      useCustom && customSound
        ? URL.createObjectURL(customSound.blob)
        : getSelectedDefaultTimerSound().url

    if (activeAudioUrl) {
      URL.revokeObjectURL(activeAudioUrl)
      activeAudioUrl = null
    }

    activeAudioUrl = isBlobUrl ? sourceUrl : null
    playbackCallback = onPlaybackChange ?? null

    const safeVolume = Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : 1

    audio.src = sourceUrl
    audio.loop = loop
    audio.volume = safeVolume
    audio.muted = safeVolume === 0
    audio.currentTime = 0

    let cleaned = false

    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      isAlarmPlaying = false

      if (isBlobUrl && activeAudioUrl === sourceUrl) {
        URL.revokeObjectURL(sourceUrl)
        activeAudioUrl = null
      }

      const callback = playbackCallback
      playbackCallback = null
      callback?.(false)
    }

    audio.onended = loop ? null : cleanup
    audio.onerror = cleanup

    isAlarmPlaying = true
    await audio.play()

    // Pemutaran mungkin sudah dibatalkan ketika audio.play() menunggu.
    if (currentGeneration !== playbackGeneration) {
      cleanup()
      return false
    }

    onPlaybackChange?.(true)

    return true
  } catch (error) {
    if (currentGeneration === playbackGeneration) {
      stopTimerEndSound()
    }

    console.warn('Suara timer tidak dapat diputar:', error)
    return false
  }
}

export async function saveProfilePhoto(file: File): Promise<void> {
  const db = await openAudioDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).put(file, PROFILE_PHOTO_KEY)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(
        transaction.error ??
          new Error('Penyimpanan foto profil dibatalkan.'),
      )
    }
  })
}

export async function getProfilePhoto(): Promise<Blob | null> {
  const db = await openAudioDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(PROFILE_PHOTO_KEY)

    request.onsuccess = () => {
      const result = request.result

      db.close()
      resolve(result instanceof Blob ? result : null)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(
        transaction.error ??
          new Error('Pembacaan foto profil dibatalkan.'),
      )
    }
  })
}

export async function deleteProfilePhoto(): Promise<void> {
  const db = await openAudioDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).delete(PROFILE_PHOTO_KEY)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(
        transaction.error ??
          new Error('Penghapusan foto profil dibatalkan.'),
      )
    }
  })
}