
import {
  initialAppData,
  type AppData,
  type DailyRecord,
} from '../types/app'

const STORAGE_KEY = 'bismillah-kelar-data'

export function normalizeAppData(
  input?: Partial<AppData> | null,
): AppData {
  const saved = input ?? {}

  const savedSettings = saved.settings

  const dailyRecords: Record<string, DailyRecord> = {}

  if (
    saved.dailyRecords &&
    typeof saved.dailyRecords === 'object'
  ) {
    Object.entries(saved.dailyRecords).forEach(([date, record]) => {
      dailyRecords[date] = {
        habitStatus: record?.habitStatus ?? {},
        note: record?.note ?? '',
        focusSessions: record?.focusSessions ?? 0,
        focusMinutes: record?.focusMinutes ?? 0,
      }
    })
  }

  return {
    tasks: Array.isArray(saved.tasks)
      ? saved.tasks
      : initialAppData.tasks,

    agenda:
      saved.agenda && typeof saved.agenda === 'object'
        ? saved.agenda
        : initialAppData.agenda,

    habits: Array.isArray(saved.habits)
      ? saved.habits
      : initialAppData.habits,

    dailyRecords,

    settings: {
      ...initialAppData.settings,
      ...savedSettings,
      notifications: {
        ...initialAppData.settings.notifications,
        ...savedSettings?.notifications,
      },
    },
  }
}

export function getAppData(): AppData {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY)

    if (!savedData) {
      return initialAppData
    }

    const parsedData = JSON.parse(savedData) as Partial<AppData>

    return normalizeAppData(parsedData)
  } catch (error) {
    console.error('Gagal membaca data aplikasi:', error)
    return initialAppData
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data),
    )
  } catch (error) {
    console.error('Gagal menyimpan data aplikasi:', error)
  }
}

export function clearAppData(): void {
  localStorage.removeItem(STORAGE_KEY)
}
