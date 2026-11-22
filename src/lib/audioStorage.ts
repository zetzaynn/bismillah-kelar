
const DB_NAME = 'bismillah-kelar-audio'
const STORE_NAME = 'sounds'
const SOUND_KEY = 'timer-end'
const PROFILE_PHOTO_KEY = 'profile-photo'

export interface TimerSound {
  name: string
  blob: Blob
}

let activeAudio: HTMLAudioElement | null = null
let activeAudioUrl: string | null = null
let playbackCallback: ((playing: boolean) => void) | null = null

// Mencegah audio lama diputar setelah perintah stop.
let playbackGeneration = 0

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
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
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function getTimerSound(): Promise<TimerSound | null> {
  const db = await openAudioDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(SOUND_KEY)

    request.onsuccess = () => {
      const result = request.result ?? null
      db.close()
      resolve(result)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
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
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export function stopTimerEndSound(): void {
  // Membatalkan semua proses pemutaran yang masih tertunda.
  playbackGeneration += 1

  if (activeAudio) {
    activeAudio.onended = null
    activeAudio.onerror = null
    activeAudio.pause()
    activeAudio.currentTime = 0
    activeAudio = null
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
): Promise<boolean> {
  stopTimerEndSound()

  const currentGeneration = playbackGeneration

  try {
    const sound = await getTimerSound()

    // Jangan lanjutkan jika sudah ada perintah stop atau pemutaran baru.
    if (currentGeneration !== playbackGeneration) {
      return false
    }

    if (!sound) return false

    const audioUrl = URL.createObjectURL(sound.blob)
    const audio = new Audio(audioUrl)

    activeAudio = audio
    activeAudioUrl = audioUrl
    playbackCallback = onPlaybackChange ?? null

    audio.volume = Math.max(0, Math.min(1, volume))

    const cleanup = () => {
      if (activeAudio !== audio) return

      activeAudio = null

      if (activeAudioUrl === audioUrl) {
        URL.revokeObjectURL(audioUrl)
        activeAudioUrl = null
      }

      const callback = playbackCallback
      playbackCallback = null
      callback?.(false)
    }

    audio.onended = cleanup
    audio.onerror = cleanup

    await audio.play()

    // Pemutaran mungkin sudah dibatalkan ketika audio.play() menunggu.
    if (
      currentGeneration !== playbackGeneration ||
      activeAudio !== audio
    ) {
      return false
    }

    onPlaybackChange?.(true)

    return true
  } catch (error) {
    if (currentGeneration === playbackGeneration) {
      stopTimerEndSound()
    }

    console.error('Suara timer tidak dapat diputar:', error)
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
      reject(transaction.error)
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
      reject(transaction.error)
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
      reject(transaction.error)
    }
  })
}
