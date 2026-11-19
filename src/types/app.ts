
export type TaskStatus = 'todo' | 'done'

export type TaskPriority = 'Tinggi' | 'Sedang' | 'Rendah'

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
}

export interface DailyRecord {
  habitStatus: Record<number, boolean>
  note: string
  focusSessions: number
  focusMinutes: number
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
  tasks: Task[]
  agenda: Record<string, AgendaItem[]>
  habits: Habit[]
  dailyRecords: Record<string, DailyRecord>
  settings: AppSettings
}

export const initialAppData: AppData = {
  tasks: [],
  agenda: {},

  habits: [
    {
      id: 1,
      title: 'Tilawah',
      detail: 'Rutinitas pagi',
    },
    {
      id: 2,
      title: 'Minum Air',
      detail: 'Target harian',
    },
    {
      id: 3,
      title: 'Jurnal',
      detail: '15 menit malam',
    },
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
    greeting: 'Semoga harimu berkah, Zayy.',
    soundVolume: 1,
  },
}
