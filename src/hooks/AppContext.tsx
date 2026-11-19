
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
  type Task,
  type AgendaItem,
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
  playTimerEndSound,
  stopTimerEndSound,
} from '../lib/audioStorage'

const FOCUS_TIMER_STORAGE_KEY = 'bismillah-kelar-focus-timer'

function getMinutes(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function getInitialFocusTimer(focusDuration: string): FocusTimerState {
  const defaultMinutes = getMinutes(focusDuration, 25)

  const defaultTimer: FocusTimerState = {
    mode: 'focus',
    status: 'idle',
    endsAt: null,
    remainingSeconds: defaultMinutes * 60,
    sessionMinutes: defaultMinutes,
  }

  try {
    const saved = localStorage.getItem(FOCUS_TIMER_STORAGE_KEY)

    if (!saved) return defaultTimer

    const parsed = JSON.parse(saved) as Partial<FocusTimerState>

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
          : defaultMinutes,
    }
  } catch {
    return defaultTimer
  }
}

function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// Suara bawaan jika MP3 belum tersedia atau gagal diputar
function playTimerSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext
        }
      ).webkitAudioContext

    if (!AudioContextClass) return

    const audioContext = new AudioContextClass()

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
        0.18,
        startTime + 0.03,
      )
      gain.gain.setValueAtTime(
        0.18,
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
    }

    const startTime = audioContext.currentTime

    playTone(660, startTime, 0.2)
    playTone(880, startTime + 0.25, 0.25)
    playTone(1046, startTime + 0.55, 0.4)

    window.setTimeout(() => {
      void audioContext.close()
    }, 1500)
  } catch (error) {
    console.warn('Suara timer tidak dapat diputar:', error)
  }
}

// Notifikasi browser
function sendFocusNotification(title: string, body: string) {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return null
  }

  try {
    return new Notification(title, { body })
  } catch (error) {
    console.warn('Notifikasi tidak dapat ditampilkan:', error)
    return null
  }
}

interface AppContextType {
  data: AppData

  focusTimer: FocusTimerState
  startFocusTimer: () => void
  pauseFocusTimer: () => void
  resetFocusTimer: () => void

  hasActiveCompletionAlert: boolean
  stopCompletionAlert: () => void

  addTask: (task: Task) => void
  updateTask: (id: number, updates: Partial<Task>) => void
  deleteTask: (id: number) => void

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

  const [focusTimer, setFocusTimer] = useState<FocusTimerState>(() =>
    getInitialFocusTimer(data.settings.focusDuration),
  )

  const [isCompletionSoundPlaying, setIsCompletionSoundPlaying] =
    useState(false)

  const [isCompletionNotificationActive, setIsCompletionNotificationActive] =
    useState(false)

  const completedTimerRef = useRef<number | null>(null)
  const activeNotificationRef = useRef<Notification | null>(null)

  const hasActiveCompletionAlert =
    isCompletionSoundPlaying || isCompletionNotificationActive

  useEffect(() => {
    saveAppData(data)
  }, [data])

  // Simpan timer secara terpisah agar tidak hilang saat berpindah halaman.
  useEffect(() => {
    localStorage.setItem(
      FOCUS_TIMER_STORAGE_KEY,
      JSON.stringify(focusTimer),
    )
  }, [focusTimer])

  // Menghentikan suara dan menutup notifikasi timer.
  function stopCompletionAlert() {
    stopTimerEndSound()
    setIsCompletionSoundPlaying(false)

    if (activeNotificationRef.current) {
      activeNotificationRef.current.close()
      activeNotificationRef.current = null
    }

    setIsCompletionNotificationActive(false)
  }

  // Menampilkan notifikasi yang bisa ditutup dari aplikasi.
  function showCompletionNotification(title: string, body: string) {
    const notification = sendFocusNotification(title, body)

    if (!notification) return

    activeNotificationRef.current?.close()
    activeNotificationRef.current = notification
    setIsCompletionNotificationActive(true)

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

  // Memutar MP3 pribadi, lalu memakai suara bawaan jika gagal.
  async function playCompletionSound(volume: number) {
    try {
      const played = await playTimerEndSound(
        volume,
        setIsCompletionSoundPlaying,
      )

      if (!played) {
        playTimerSound()
      }
    } catch (error) {
      console.warn('Gagal memutar MP3 timer:', error)
      playTimerSound()
    }
  }

  // Timer berjalan di tingkat AppProvider.
  useEffect(() => {
    if (focusTimer.status !== 'running' || focusTimer.endsAt === null) {
      return
    }

    const timerEndsAt = focusTimer.endsAt
    const timerMode = focusTimer.mode
    const sessionMinutes = focusTimer.sessionMinutes

    const interval = window.setInterval(() => {
      if (Date.now() < timerEndsAt) return

      if (completedTimerRef.current === timerEndsAt) return
      completedTimerRef.current = timerEndsAt

      // Putar MP3 pribadi atau suara bawaan.
      void playCompletionSound(data.settings.soundVolume ?? 1)

      if (timerMode === 'focus') {
        const today = getTodayKey()

        setData((current) => {
          const previous = current.dailyRecords[today] ?? {
            habitStatus: {},
            note: '',
            focusSessions: 0,
            focusMinutes: 0,
          }

          return {
            ...current,
            dailyRecords: {
              ...current.dailyRecords,
              [today]: {
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
    }, 500)

    return () => window.clearInterval(interval)
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
        endsAt: Date.now() + duration * 1000,
        remainingSeconds: duration,
        sessionMinutes,
      }
    })

    if (
      data.settings.notifications.focus &&
      'Notification' in window
    ) {
      if (Notification.permission === 'granted') {
        sendFocusNotification(
          focusTimer.mode === 'focus'
            ? 'Sesi fokus dimulai'
            : 'Waktu istirahat dimulai',
          focusTimer.mode === 'focus'
            ? 'Saatnya fokus pada satu hal.'
            : 'Nikmati waktu istirahatmu.',
        )
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            sendFocusNotification(
              'Timer aktif',
              'Notifikasi timer berhasil diaktifkan.',
            )
          }
        })
      }
    }
  }

  function pauseFocusTimer() {
    setFocusTimer((current) => {
      if (current.status !== 'running' || current.endsAt === null) {
        return current
      }

      const remaining = Math.max(
        0,
        Math.ceil((current.endsAt - Date.now()) / 1000),
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
    setData(normalizeAppData(newData))
  }

  return (
    <AppContext.Provider
      value={{
        data,
        focusTimer,
        startFocusTimer,
        pauseFocusTimer,
        resetFocusTimer,
        hasActiveCompletionAlert,
        stopCompletionAlert,
        addTask,
        updateTask,
        deleteTask,
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
