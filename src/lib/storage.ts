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
  const savedProfile = saved.profile

  const dailyRecords: Record<string, DailyRecord> = {}

  if (
    saved.dailyRecords &&
    typeof saved.dailyRecords === 'object' &&
    !Array.isArray(saved.dailyRecords)
  ) {
    Object.entries(saved.dailyRecords).forEach(([date, record]) => {
      if (!record || typeof record !== 'object') return

      dailyRecords[date] = {
        habitStatus:
          record.habitStatus &&
          typeof record.habitStatus === 'object'
            ? record.habitStatus
            : {},
        note:
          typeof record.note === 'string'
            ? record.note
            : '',
        focusSessions:
          typeof record.focusSessions === 'number'
            ? record.focusSessions
            : 0,
        focusMinutes:
          typeof record.focusMinutes === 'number'
            ? record.focusMinutes
            : 0,
        breakSessions:
          typeof record.breakSessions === 'number'
            ? record.breakSessions
            : 0,
        ...(record.reflection && typeof record.reflection === 'object'
          ? {
              reflection: {
                good:
                  typeof record.reflection.good === 'string'
                    ? record.reflection.good
                    : '',
                improve:
                  typeof record.reflection.improve === 'string'
                    ? record.reflection.improve
                    : '',
                next:
                  typeof record.reflection.next === 'string'
                    ? record.reflection.next
                    : '',
              },
            }
          : {}),
      }
    })
  }

  return {
    profile: {
      name:
        typeof savedProfile?.name === 'string'
          ? savedProfile.name
          : initialAppData.profile.name,

      photo:
        typeof savedProfile?.photo === 'string'
          ? savedProfile.photo
          : null,
    },

    tasks: Array.isArray(saved.tasks)
      ? saved.tasks
      : initialAppData.tasks,

    agenda:
      saved.agenda &&
      typeof saved.agenda === 'object' &&
      !Array.isArray(saved.agenda)
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
      return normalizeAppData(initialAppData)
    }

    const parsedData = JSON.parse(savedData) as Partial<AppData>

    return normalizeAppData(parsedData)
  } catch (error) {
    console.error('Gagal membaca data aplikasi:', error)

    return normalizeAppData(initialAppData)
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