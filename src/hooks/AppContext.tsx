import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  type AppData,
  type UserProfile,
  type Task,
  type AgendaItem,
  type Habit,
  type AppSettings,
  type DailyRecord,
  type FocusTimerState,
} from '../types/app'

import {
  getAppData,
  saveAppData,
  normalizeAppData,
} from '../lib/storage'

import {
  primeTimerEndSound,
  playTimerEndSound,
  stopTimerEndSound,
  startBackgroundTimerKeepAlive,
  stopBackgroundTimerKeepAlive,
  saveProfilePhoto,
  getProfilePhoto,
  deleteProfilePhoto,
} from '../lib/audioStorage'

import {
  getSyncMetadata,
  markPendingLocalChange,
  pullDataFromCloud,
  pushDataToCloud,
} from '../lib/cloudSync'

const FOCUS_TIMER_STORAGE_KEY = 'bismillah-kelar-focus-timer'
const SENT_REMINDERS_STORAGE_KEY = 'bismillah-kelar-sent-reminders'
const TIMER_NOTIFICATION_TAG = 'bismillah-kelar-timer'

const ALLOWED_PROFILE_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

type StoredFocusTimer = FocusTimerState & {
  dateKey?: string
}

function getMinutes(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function formatDateKey(timestamp: number = Date.now()) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDefaultFocusTimer(focusDuration: string): FocusTimerState {
  const defaultMinutes = getMinutes(focusDuration, 25)

  return {
    mode: 'focus',
    status: 'idle',
    endsAt: null,
    remainingSeconds: defaultMinutes * 60,
    sessionMinutes: defaultMinutes,
  }
}

function getInitialFocusTimer(focusDuration: string): FocusTimerState {
  const defaultTimer = getDefaultFocusTimer(focusDuration)
  const todayKey = formatDateKey()

  try {
    const saved = localStorage.getItem(FOCUS_TIMER_STORAGE_KEY)

    if (!saved) return defaultTimer

    const parsed = JSON.parse(saved) as Partial<StoredFocusTimer>

    if (parsed.dateKey !== todayKey) {
      return defaultTimer
    }

    if (
      (parsed.mode !== 'focus' && parsed.mode !== 'break') ||
      !['idle', 'running', 'paused'].includes(parsed.status ?? '') ||
      typeof parsed.remainingSeconds !== 'number'
    ) {
      return defaultTimer
    }

    return {
      mode: parsed.mode,
      status: parsed.status as FocusTimerState['status'],
      endsAt:
        typeof parsed.endsAt === 'number' ? parsed.endsAt : null,
      remainingSeconds: Math.max(0, parsed.remainingSeconds),
      sessionMinutes:
        typeof parsed.sessionMinutes === 'number'
          ? parsed.sessionMinutes
          : defaultTimer.sessionMinutes,
    }
  } catch {
    return defaultTimer
  }
}

function formatTimeHHMM(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

function getSentReminders(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_REMINDERS_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set()
  } catch {
    return new Set()
  }
}

function markReminderSent(key: string) {
  try {
    const sent = getSentReminders()
    sent.add(key)
    const trimmed = Array.from(sent).slice(-200)
    localStorage.setItem(
      SENT_REMINDERS_STORAGE_KEY,
      JSON.stringify(trimmed),
    )
  } catch {
    // Abaikan jika penyimpanan penuh.
  }
}

function getAudioContextClass() {
  if (typeof window === 'undefined') return undefined

  return (
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext
      }
    ).webkitAudioContext
  )
}

let sharedAudioContext: AudioContext | null = null
let fallbackAudioTimeout: number | null = null
let fallbackAudioInterval: number | null = null
let fallbackPlaybackCallback: ((playing: boolean) => void) | null = null

function unlockFallbackAudioContext() {
  try {
    const AudioContextClass = getAudioContextClass()
    if (!AudioContextClass) return

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass()
    }

    if (sharedAudioContext.state === 'suspended') {
      void sharedAudioContext.resume().catch(() => {})
    }
  } catch {
    // Abaikan jika perangkat membatasi AudioContext.
  }
}

function stopTimerSound() {
  if (fallbackAudioInterval !== null) {
    window.clearInterval(fallbackAudioInterval)
    fallbackAudioInterval = null
  }

  if (fallbackAudioTimeout !== null) {
    window.clearTimeout(fallbackAudioTimeout)
    fallbackAudioTimeout = null
  }

  const callback = fallbackPlaybackCallback
  fallbackPlaybackCallback = null
  callback?.(false)
}

function playTimerSound(
  volume: number = 1,
  onPlaybackChange?: (playing: boolean) => void,
  loop: boolean = false,
) {
  try {
    stopTimerSound()

    const safeVolume = Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : 1

    if (safeVolume <= 0) {
      onPlaybackChange?.(false)
      return
    }

    const AudioContextClass = getAudioContextClass()
    if (!AudioContextClass) return

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass()
    }

    const audioContext = sharedAudioContext

    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {})
    }

    fallbackPlaybackCallback = onPlaybackChange ?? null
    onPlaybackChange?.(true)

    const peakGain = 0.28 * safeVolume

    const playTone = (
      frequency: number,
      startTime: number,
      duration: number,
    ) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(
        peakGain,
        startTime + 0.03,
      )
      gain.gain.setValueAtTime(
        peakGain,
        startTime + duration - 0.05,
      )
      gain.gain.linearRampToValueAtTime(
        0,
        startTime + duration,
      )

      oscillator.connect(gain)
      gain.connect(audioContext.destination)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)

      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
    }

    const triggerChime = () => {
      if (audioContext.state === 'closed') return
      if (audioContext.state === 'suspended') {
        void audioContext.resume().catch(() => {})
      }

      const startTime = audioContext.currentTime
      playTone(660, startTime, 0.2)
      playTone(880, startTime + 0.25, 0.25)
      playTone(1046, startTime + 0.55, 0.4)
    }

    triggerChime()

    if (loop) {
      fallbackAudioInterval = window.setInterval(triggerChime, 1600)
    } else {
      fallbackAudioTimeout = window.setTimeout(() => {
        fallbackAudioTimeout = null
        const callback = fallbackPlaybackCallback
        fallbackPlaybackCallback = null
        callback?.(false)
      }, 1100)
    }
  } catch (error) {
    stopTimerSound()
    console.warn('Suara timer tidak dapat diputar:', error)
  }
}

export function sendDeviceNotification(
  title: string,
  body: string,
  tag?: string,
  urgent: boolean = false,
): Notification | null {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return null
  }

  const options: NotificationOptions & {
    renotify?: boolean
    vibrate?: number[]
  } = {
    body,
    tag,
    requireInteraction: urgent,
    renotify: urgent,
    vibrate: urgent ? [400, 200, 400, 200, 600] : [200, 100, 200],
  }

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {})
  }

  try {
    return new Notification(title, options)
  } catch {
    return null
  }
}

function createUnthrottledTicker(onTick: () => void): () => void {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    const id = window.setInterval(onTick, 250)
    return () => window.clearInterval(id)
  }

  try {
    const workerCode = `
      let timer = null;
      self.onmessage = (e) => {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => self.postMessage('tick'), 250);
        } else if (e.data === 'stop') {
          if (timer) clearInterval(timer);
          timer = null;
        }
      };
    `
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    const worker = new Worker(workerUrl)

    worker.onmessage = () => {
      onTick()
    }
    worker.postMessage('start')

    return () => {
      worker.postMessage('stop')
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
    }
  } catch {
    const id = window.setInterval(onTick, 250)
    return () => window.clearInterval(id)
  }
}

interface AppContextType {
  data: AppData

  isOnline: boolean
  isSyncing: boolean
  syncNow: () => Promise<void>

  profilePhotoUrl: string | null
  updateProfile: (updates: Partial<UserProfile>) => void
  updateProfilePhoto: (file: File) => Promise<void>
  removeProfilePhoto: () => Promise<void>

  focusTimer: FocusTimerState
  startFocusTimer: () => void
  pauseFocusTimer: () => void
  resetFocusTimer: () => void

  hasActiveCompletionAlert: boolean
  stopCompletionAlert: () => void

  addTask: (task: Task) => void
  updateTask: (id: number, updates: Partial<Task>) => void
  deleteTask: (id: number) => void
  addHabit: (habit: Omit<Habit, 'id'>) => void
  updateHabit: (id: number, updates: Partial<Habit>) => void
  deleteHabit: (id: number) => void

  addAgenda: (date: string, item: AgendaItem) => void
  updateAgenda: (
    date: string,
    id: number,
    updates: Partial<AgendaItem>,
  ) => void
  deleteAgenda: (date: string, id: number) => void

  updateDailyRecord: (
    date: string,
    updates: Partial<DailyRecord>,
  ) => void

  updateSettings: (settings: Partial<AppSettings>) => void
  replaceData: (newData: AppData) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => getAppData())

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const isApplyingRemoteRef = useRef(false)
  const syncDebounceRef = useRef<number | null>(null)
  const latestDataRef = useRef<AppData>(data)
  latestDataRef.current = data

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)

  const profilePhotoUrlRef = useRef<string | null>(null)

  const [focusTimer, setFocusTimer] = useState<FocusTimerState>(() =>
    getInitialFocusTimer(data.settings.focusDuration),
  )

  const [timerDateKey, setTimerDateKey] = useState<string>(() =>
    formatDateKey(),
  )

  const [isCompletionSoundPlaying, setIsCompletionSoundPlaying] =
    useState(false)

  const [isCompletionNotificationActive, setIsCompletionNotificationActive] =
    useState(false)

  const completedTimerRef = useRef<number | null>(null)
  const activeNotificationRef = useRef<Notification | null>(null)
  const completionPlaybackIdRef = useRef(0)

  const hasActiveCompletionAlert =
    isCompletionSoundPlaying || isCompletionNotificationActive

  async function syncNow() {
    const meta = getSyncMetadata()
    if (!meta.syncKey || !meta.isConfigured || !navigator.onLine) return

    setIsSyncing(true)
    try {
      if (meta.hasPendingPush) {
        await pushDataToCloud(meta.syncKey, latestDataRef.current)
      } else {
        const remote = await pullDataFromCloud(meta.syncKey)
        if (remote?.payload) {
          isApplyingRemoteRef.current = true
          replaceData(remote.payload)
        }
      }
    } catch (error) {
      console.warn('Sinkronisasi tertunda (akan dicoba lagi saat online):', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Simpan data utama aplikasi & antrekan sinkronisasi cloud
  useEffect(() => {
    saveAppData(data)

    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false
      return
    }

    const meta = getSyncMetadata()
    if (!meta.syncKey || !meta.isConfigured) return

    markPendingLocalChange()

    if (!navigator.onLine) return

    if (syncDebounceRef.current !== null) {
      window.clearTimeout(syncDebounceRef.current)
    }

    syncDebounceRef.current = window.setTimeout(() => {
      void pushDataToCloud(meta.syncKey!, data).catch(() => {})
    }, 1500)

    return () => {
      if (syncDebounceRef.current !== null) {
        window.clearTimeout(syncDebounceRef.current)
      }
    }
  }, [data])

  // Pantau status online/offline & tarik pembaruan saat aplikasi kembali aktif
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void syncNow()
    }
    const handleOffline = () => setIsOnline(false)
    const handleVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void syncNow()
      }
    }

    if (navigator.onLine) {
      void syncNow()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [])

  // Memuat foto profil dari IndexedDB saat aplikasi dibuka.
  useEffect(() => {
    let cancelled = false

    async function loadProfilePhoto() {
      try {
        const photo = await getProfilePhoto()

        if (!photo || cancelled) return

        const url = URL.createObjectURL(photo)

        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }

        profilePhotoUrlRef.current = url
        setProfilePhotoUrl(url)

        setData((current) => ({
          ...current,
          profile: {
            ...current.profile,
            photo: 'indexeddb',
          },
        }))
      } catch (error) {
        console.error('Gagal memuat foto profil:', error)
      }
    }

    void loadProfilePhoto()

    return () => {
      cancelled = true

      if (profilePhotoUrlRef.current) {
        URL.revokeObjectURL(profilePhotoUrlRef.current)
        profilePhotoUrlRef.current = null
      }
    }
  }, [])

  // Simpan timer beserta tanggal aktif agar otomatis reset saat berganti hari.
  useEffect(() => {
    try {
      const payload: StoredFocusTimer = {
        ...focusTimer,
        dateKey: timerDateKey,
      }

      localStorage.setItem(
        FOCUS_TIMER_STORAGE_KEY,
        JSON.stringify(payload),
      )
    } catch {
      // Abaikan jika penyimpanan penuh atau tidak tersedia.
    }
  }, [focusTimer, timerDateKey])

  // Reset timer otomatis ke mode fokus apabila hari berganti (00:00).
  useEffect(() => {
    const syncTimerDay = () => {
      const currentDayKey = formatDateKey()

      if (currentDayKey !== timerDateKey) {
        setTimerDateKey(currentDayKey)

        setFocusTimer((current) => {
          if (current.status === 'running') return current
          return getDefaultFocusTimer(data.settings.focusDuration)
        })
      }
    }

    syncTimerDay()

    const interval = window.setInterval(syncTimerDay, 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncTimerDay()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', syncTimerDay)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', syncTimerDay)
    }
  }, [timerDateKey, data.settings.focusDuration])

  useEffect(() => {
    if (focusTimer.status === 'running') {
      startBackgroundTimerKeepAlive(focusTimer.mode)
    } else {
      stopBackgroundTimerKeepAlive()
    }
  }, [focusTimer.status, focusTimer.mode])

  useEffect(() => {
    setFocusTimer((current) => {
      if (current.status !== 'idle') return current

      const targetMinutes = getMinutes(
        current.mode === 'focus'
          ? data.settings.focusDuration
          : data.settings.breakDuration,
        current.mode === 'focus' ? 25 : 5,
      )

      const targetSeconds = targetMinutes * 60

      if (
        current.sessionMinutes === targetMinutes &&
        current.remainingSeconds === targetSeconds
      ) {
        return current
      }

      return {
        ...current,
        remainingSeconds: targetSeconds,
        sessionMinutes: targetMinutes,
      }
    })
  }, [data.settings.focusDuration, data.settings.breakDuration])

  function setProfilePhoto(blob: Blob | null) {
    if (profilePhotoUrlRef.current) {
      URL.revokeObjectURL(profilePhotoUrlRef.current)
      profilePhotoUrlRef.current = null
    }

    if (!blob) {
      setProfilePhotoUrl(null)
      return
    }

    const url = URL.createObjectURL(blob)

    profilePhotoUrlRef.current = url
    setProfilePhotoUrl(url)
  }

  function updateProfile(updates: Partial<UserProfile>) {
    setData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        ...updates,
      },
    }))
  }

  async function updateProfilePhoto(file: File) {
    if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type)) {
      throw new Error('Format foto harus JPG, PNG, atau WebP.')
    }

    await saveProfilePhoto(file)

    setProfilePhoto(file)

    setData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        photo: 'indexeddb',
      },
    }))
  }

  async function removeProfilePhoto() {
    await deleteProfilePhoto()

    setProfilePhoto(null)

    setData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        photo: null,
      },
    }))
  }

  function stopCompletionAlert() {
    completionPlaybackIdRef.current += 1

    stopTimerEndSound()
    stopTimerSound()
    setIsCompletionSoundPlaying(false)

    if (activeNotificationRef.current) {
      activeNotificationRef.current.close()
      activeNotificationRef.current = null
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.ready
        .then((registration) =>
          registration.getNotifications({ tag: TIMER_NOTIFICATION_TAG }),
        )
        .then((notifications) => {
          notifications.forEach((item) => item.close())
        })
        .catch(() => {})
    }

    setIsCompletionNotificationActive(false)
  }

  function showCompletionNotification(title: string, body: string) {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return
    }

    const notification = sendDeviceNotification(
      title,
      body,
      TIMER_NOTIFICATION_TAG,
      true,
    )

    setIsCompletionNotificationActive(true)

    if (!notification) {
      return
    }

    activeNotificationRef.current?.close()
    activeNotificationRef.current = notification

    notification.onclose = () => {
      if (activeNotificationRef.current === notification) {
        activeNotificationRef.current = null
        setIsCompletionNotificationActive(false)
      }
    }

    notification.onerror = () => {
      if (activeNotificationRef.current === notification) {
        activeNotificationRef.current = null
        setIsCompletionNotificationActive(false)
      }
    }
  }

  async function playCompletionSound(volume: number) {
    const playbackId = ++completionPlaybackIdRef.current

    stopTimerSound()

    try {
      const played = await playTimerEndSound(
        volume,
        setIsCompletionSoundPlaying,
        true,
      )

      if (playbackId !== completionPlaybackIdRef.current) {
        return
      }

      if (!played) {
        playTimerSound(volume, setIsCompletionSoundPlaying, true)
      }
    } catch (error) {
      if (playbackId !== completionPlaybackIdRef.current) {
        return
      }

      console.warn('Gagal memutar audio timer:', error)
      playTimerSound(volume, setIsCompletionSoundPlaying, true)
    }
  }

  useEffect(() => {
    const checkScheduledReminders = () => {
      if (
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        Notification.permission !== 'granted'
      ) {
        return
      }

      const now = new Date()
      const todayKey = formatDateKey(now.getTime())
      const currentHHMM = formatTimeHHMM(now)
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes()
      const sent = getSentReminders()

      if (
        data.settings.notifications.daily &&
        currentHHMM === '07:00'
      ) {
        const key = `daily-${todayKey}`
        if (!sent.has(key)) {
          const todayTasksCount = data.tasks.filter(
            (t) => t.date === todayKey && t.status === 'todo',
          ).length
          sendDeviceNotification(
            'Bismillah, mulai harimu!',
            todayTasksCount > 0
              ? `Kamu punya ${todayTasksCount} target tugas untuk diselesaikan hari ini.`
              : 'Yuk cek agenda dan target produktivitasmu hari ini.',
            key,
          )
          markReminderSent(key)
        }
      }

      if (data.settings.notifications.daily) {
        const todayAgendas = data.agenda[todayKey] ?? []
        for (const item of todayAgendas) {
          if (item.done) continue
          const itemMinutes = parseTimeToMinutes(item.time)
          if (itemMinutes !== null && itemMinutes === currentTotalMinutes) {
            const key = `agenda-${todayKey}-${item.id}-${item.time}`
            if (!sent.has(key)) {
              sendDeviceNotification(
                `Jadwal Dimulai: ${item.title}`,
                `Pukul ${item.time} WIB • ${item.category}`,
                key,
              )
              markReminderSent(key)
            }
          }
        }
      }

      if (data.settings.notifications.deadline) {
        const todayTasks = data.tasks.filter(
          (t) => t.date === todayKey && t.status === 'todo',
        )
        for (const task of todayTasks) {
          const taskMinutes = parseTimeToMinutes(task.time)
          if (taskMinutes === null) continue

          const diffMinutes = taskMinutes - currentTotalMinutes

          if (diffMinutes === 120) {
            const key = `deadline-2h-${todayKey}-${task.id}-${task.time}`
            if (!sent.has(key)) {
              sendDeviceNotification(
                `2 Jam Menuju Tenggat: ${task.title}`,
                `Batas waktu pukul ${task.time} WIB (${task.priority}).`,
                key,
              )
              markReminderSent(key)
            }
          } else if (diffMinutes === 0) {
            const key = `deadline-now-${todayKey}-${task.id}-${task.time}`
            if (!sent.has(key)) {
              sendDeviceNotification(
                `Batas Waktu Tugas: ${task.title}`,
                `Sudah pukul ${task.time} WIB. Yuk segera tuntaskan!`,
                key,
              )
              markReminderSent(key)
            }
          }
        }
      }

      if (
        data.settings.notifications.reflection &&
        currentHHMM === '21:30'
      ) {
        const key = `reflection-${todayKey}`
        if (!sent.has(key)) {
          sendDeviceNotification(
            'Waktunya Refleksi Malam',
            'Luangkan sejenak untuk mencatat progres dan evaluasi harimu.',
            key,
          )
          markReminderSent(key)
        }
      }
    }

    checkScheduledReminders()

    const interval = window.setInterval(checkScheduledReminders, 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkScheduledReminders()
      }
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [
    data.agenda,
    data.tasks,
    data.settings.notifications.daily,
    data.settings.notifications.deadline,
    data.settings.notifications.reflection,
  ])

  useEffect(() => {
    if (focusTimer.status !== 'running' || focusTimer.endsAt === null) {
      return
    }

    const timerEndsAt = focusTimer.endsAt
    const timerMode = focusTimer.mode
    const sessionMinutes = focusTimer.sessionMinutes

    const checkTimerCompletion = () => {
      if (Date.now() < timerEndsAt) return

      if (completedTimerRef.current === timerEndsAt) return
      completedTimerRef.current = timerEndsAt

      stopBackgroundTimerKeepAlive()
      void playCompletionSound(data.settings.soundVolume ?? 1)

      if (timerMode === 'focus') {
        const completedDateKey = formatDateKey(timerEndsAt)
        setTimerDateKey(completedDateKey)

        setData((current) => {
          const previous = current.dailyRecords[completedDateKey] ?? {
            habitStatus: {},
            note: '',
            focusSessions: 0,
            focusMinutes: 0,
          }

          return {
            ...current,
            dailyRecords: {
              ...current.dailyRecords,
              [completedDateKey]: {
                ...previous,
                focusSessions: previous.focusSessions + 1,
                focusMinutes: previous.focusMinutes + sessionMinutes,
              },
            },
          }
        })

        const breakMinutes = getMinutes(
          data.settings.breakDuration,
          5,
        )

        setFocusTimer({
          mode: 'break',
          status: 'idle',
          endsAt: null,
          remainingSeconds: breakMinutes * 60,
          sessionMinutes: breakMinutes,
        })

        if (data.settings.notifications.focus) {
          showCompletionNotification(
            'Waktunya beristirahat!',
            'Sesi fokus selesai. Saatnya mengambil jeda sejenak.',
          )
        }
      } else {
        const completedDateKey = formatDateKey(timerEndsAt)
        setTimerDateKey(completedDateKey)

        setData((current) => {
          const previous = current.dailyRecords[completedDateKey] ?? {
            habitStatus: {},
            note: '',
            focusSessions: 0,
            focusMinutes: 0,
            breakSessions: 0,
          }

          return {
            ...current,
            dailyRecords: {
              ...current.dailyRecords,
              [completedDateKey]: {
                ...previous,
                breakSessions: (previous.breakSessions ?? 0) + 1,
              },
            },
          }
        })

        const focusMinutes = getMinutes(
          data.settings.focusDuration,
          25,
        )

        setFocusTimer({
          mode: 'focus',
          status: 'idle',
          endsAt: null,
          remainingSeconds: focusMinutes * 60,
          sessionMinutes: focusMinutes,
        })

        if (data.settings.notifications.focus) {
          showCompletionNotification(
            'Waktu istirahat selesai!',
            'Yuk, kembali fokus ke aktivitasmu.',
          )
        }
      }
    }

    checkTimerCompletion()

    const stopTicker = createUnthrottledTicker(checkTimerCompletion)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimerCompletion()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkTimerCompletion)
    window.addEventListener('pageshow', checkTimerCompletion)

    return () => {
      stopTicker()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkTimerCompletion)
      window.removeEventListener('pageshow', checkTimerCompletion)
    }
  }, [
    focusTimer.status,
    focusTimer.endsAt,
    focusTimer.mode,
    focusTimer.sessionMinutes,
    data.settings.breakDuration,
    data.settings.focusDuration,
    data.settings.notifications.focus,
    data.settings.soundVolume,
  ])

  function startFocusTimer() {
    stopCompletionAlert()

    void primeTimerEndSound()
    unlockFallbackAudioContext()
    startBackgroundTimerKeepAlive(focusTimer.mode)

    const nowMs = Date.now()
    setTimerDateKey(formatDateKey(nowMs))

    setFocusTimer((current) => {
      const isResuming = current.status === 'paused'

      const duration = isResuming
        ? current.remainingSeconds
        : getMinutes(
            current.mode === 'focus'
              ? data.settings.focusDuration
              : data.settings.breakDuration,
            current.mode === 'focus' ? 25 : 5,
          ) * 60

      const sessionMinutes = isResuming
        ? current.sessionMinutes
        : Math.ceil(duration / 60)

      return {
        ...current,
        status: 'running',
        endsAt: nowMs + duration * 1000,
        remainingSeconds: duration,
        sessionMinutes,
      }
    })
  }

  function pauseFocusTimer() {
    stopBackgroundTimerKeepAlive()
    const nowMs = Date.now()
    setTimerDateKey(formatDateKey(nowMs))

    setFocusTimer((current) => {
      if (current.status !== 'running' || current.endsAt === null) {
        return current
      }

      const remaining = Math.max(
        0,
        Math.ceil((current.endsAt - nowMs) / 1000),
      )

      return {
        ...current,
        status: 'paused',
        endsAt: null,
        remainingSeconds: remaining,
      }
    })
  }

  function resetFocusTimer() {
    stopBackgroundTimerKeepAlive()
    stopCompletionAlert()
    setTimerDateKey(formatDateKey())

    setFocusTimer((current) => {
      const minutes = getMinutes(
        current.mode === 'focus'
          ? data.settings.focusDuration
          : data.settings.breakDuration,
        current.mode === 'focus' ? 25 : 5,
      )

      return {
        mode: current.mode,
        status: 'idle',
        endsAt: null,
        remainingSeconds: minutes * 60,
        sessionMinutes: minutes,
      }
    })
  }

  function addTask(task: Task) {
    setData((current) => ({
      ...current,
      tasks: [...current.tasks, task],
    }))
  }

  function updateTask(id: number, updates: Partial<Task>) {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task,
      ),
    }))
  }

  function deleteTask(id: number) {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    }))
  }

  function addHabit(habit: Omit<Habit, 'id'>) {
    setData((current) => {
      const nextId =
        current.habits.length > 0
          ? Math.max(...current.habits.map((item) => item.id)) + 1
          : 1

      return {
        ...current,
        habits: [
          ...current.habits,
          {
            ...habit,
            id: nextId,
          },
        ],
      }
    })
  }

  function updateHabit(id: number, updates: Partial<Habit>) {
    setData((current) => ({
      ...current,
      habits: current.habits.map((habit) =>
        habit.id === id
          ? { ...habit, ...updates, id }
          : habit,
      ),
    }))
  }

  function deleteHabit(id: number) {
    setData((current) => ({
      ...current,
      habits: current.habits.filter((habit) => habit.id !== id),
    }))
  }

  function addAgenda(date: string, item: AgendaItem) {
    setData((current) => ({
      ...current,
      agenda: {
        ...current.agenda,
        [date]: [...(current.agenda[date] ?? []), item],
      },
    }))
  }

  function updateAgenda(
    date: string,
    id: number,
    updates: Partial<AgendaItem>,
  ) {
    setData((current) => ({
      ...current,
      agenda: {
        ...current.agenda,
        [date]: (current.agenda[date] ?? []).map((item) =>
          item.id === id ? { ...item, ...updates } : item,
        ),
      },
    }))
  }

  function deleteAgenda(date: string, id: number) {
    setData((current) => ({
      ...current,
      agenda: {
        ...current.agenda,
        [date]: (current.agenda[date] ?? []).filter(
          (item) => item.id !== id,
        ),
      },
    }))
  }

  function updateDailyRecord(
    date: string,
    updates: Partial<DailyRecord>,
  ) {
    setData((current) => {
      const previous = current.dailyRecords[date] ?? {
        habitStatus: {},
        note: '',
        focusSessions: 0,
        focusMinutes: 0,
      }

      return {
        ...current,
        dailyRecords: {
          ...current.dailyRecords,
          [date]: {
            ...previous,
            ...updates,
            habitStatus: {
              ...previous.habitStatus,
              ...updates.habitStatus,
            },
          },
        },
      }
    })
  }

  function updateSettings(settings: Partial<AppSettings>) {
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...settings,
        notifications: {
          ...current.settings.notifications,
          ...settings.notifications,
        },
      },
    }))
  }

  function replaceData(newData: AppData) {
    stopBackgroundTimerKeepAlive()
    stopCompletionAlert()

    const normalized = normalizeAppData(newData)
    const restoredFocusMinutes = getMinutes(
      normalized.settings.focusDuration,
      25,
    )

    setTimerDateKey(formatDateKey())
    setFocusTimer({
      mode: 'focus',
      status: 'idle',
      endsAt: null,
      remainingSeconds: restoredFocusMinutes * 60,
      sessionMinutes: restoredFocusMinutes,
    })

    setData({
      ...normalized,
      profile: {
        ...normalized.profile,
        photo: profilePhotoUrlRef.current ? 'indexeddb' : null,
      },
    })
  }

  return (
    <AppContext.Provider
      value={{
        data,

        isOnline,
        isSyncing,
        syncNow,

        profilePhotoUrl,
        updateProfile,
        updateProfilePhoto,
        removeProfilePhoto,

        focusTimer,
        startFocusTimer,
        pauseFocusTimer,
        resetFocusTimer,

        hasActiveCompletionAlert,
        stopCompletionAlert,

        addTask,
        updateTask,
        deleteTask,

        addHabit,
        updateHabit,
        deleteHabit,

        addAgenda,
        updateAgenda,
        deleteAgenda,

        updateDailyRecord,
        updateSettings,
        replaceData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppData harus digunakan di dalam AppProvider')
  }

  return context
}