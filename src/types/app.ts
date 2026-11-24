export type TaskStatus = 'todo' | 'done'
export type TaskPriority = 'Tinggi' | 'Sedang' | 'Rendah'

export interface UserProfile {
  name: string
  photo: string | null
}

export interface Task {
  id: number
  title: string
  category: string
  priority: TaskPriority
  date: string
  time: string
  status: TaskStatus
}

export interface AgendaItem {
  id: number
  title: string
  time: string
  category: string
  color: string
  done: boolean
}

export interface Habit {
  id: number
  title: string
  detail: string
  icon?: string
}

export interface WeeklyReflection {
  good: string
  improve: string
  next: string
}

export interface DailyRecord {
  habitStatus: Record<number, boolean>
  note: string
  focusSessions: number
  focusMinutes: number
  breakSessions?: number
  reflection?: WeeklyReflection
}

export interface FocusTimerState {
  mode: 'focus' | 'break'
  status: 'idle' | 'running' | 'paused'
  endsAt: number | null
  remainingSeconds: number
  sessionMinutes: number
}

export interface AppSettings {
  notifications: {
    daily: boolean
    deadline: boolean
    focus: boolean
    reflection: boolean
    habits: boolean
  }
  focusDuration: string
  breakDuration: string
  dailyTarget: string
  greeting: string
  soundVolume: number
}

export interface AppData {
  profile: UserProfile
  tasks: Task[]
  agenda: Record<string, AgendaItem[]>
  habits: Habit[]
  dailyRecords: Record<string, DailyRecord>
  settings: AppSettings
}

export const initialAppData: AppData = {
  profile: {
    name: '',
    photo: null,
  },

  tasks: [],
  agenda: {},

  habits: [
    { id: 1, title: 'Mengaji', detail: 'Rutinitas harian' },
    { id: 2, title: 'Olahraga', detail: 'Menjaga kebugaran' },
    { id: 3, title: 'Tidur 8 Jam', detail: 'Menjaga waktu istirahat' },
  ],

  dailyRecords: {},

  settings: {
    notifications: {
      daily: true,
      deadline: true,
      focus: true,
      reflection: true,
      habits: false,
    },
    focusDuration: '25 Menit',
    breakDuration: '5 Menit',
    dailyTarget: '3 - 5 Target',
    greeting: 'Nihao Fineshyt',
    soundVolume: 1,
  },
}