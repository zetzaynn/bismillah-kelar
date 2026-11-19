
import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ChangeEvent,
} from 'react'

import {
  UserRound,
  Languages,
  CalendarDays,
  Clock3,
  Sunrise,
  AlertCircle,
  Timer,
  Moon,
  Heart,
  Target,
  Coffee,
  Hand,
  Database,
  Download,
  Upload,
  Trash2,
  Info,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  Check,
  Sparkles,
  X,
  FileJson,
  Mail,
  Volume2,
  Music,
  Play,
  Square,
  LoaderCircle,
} from 'lucide-react'

import { useAppData } from '../hooks/AppContext'
import type { AppData } from '../types/app'

import {
  getTimerSound,
  saveTimerSound,
  deleteTimerSound,
  playTimerEndSound,
  stopTimerEndSound,
} from '../lib/audioStorage'

const INTERACTION_SOUND_KEY = 'bismillah-kelar-interaction-sound'

type SettingItemProps = {
  icon: ElementType
  title: string
  description: string
  value?: string
  onClick?: () => void
}

function SettingItem({
  icon: Icon,
  title,
  description,
  value,
  onClick,
}: SettingItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-[#f5f0e7]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eee8df]">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs text-[#888078]">{description}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {value && (
          <span className="rounded-lg bg-[#eee8df] px-2 py-1 text-[11px] font-semibold">
            {value}
          </span>
        )}
        <ChevronRight size={17} className="text-[#999188]" />
      </div>
    </button>
  )
}

type ToggleItemProps = {
  icon: ElementType
  title: string
  description: string
  checked: boolean
  onChange: () => void
}

function ToggleItem({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eee8df]">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs text-[#888078]">{description}</p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-12 shrink-0 rounded-full border border-[#252525] p-0.5 shadow-[2px_2px_0px_#252525] transition ${
          checked ? 'bg-[#BDECCF]' : 'bg-[#e6dfd5]'
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full border border-[#252525] bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

type OptionKey = 'focus' | 'break' | 'target'

type InfoKey =
  | 'language'
  | 'calendar'
  | 'time'
  | 'version'
  | 'privacy'
  | 'cache'
  | 'feedback'

const infoContent: Record<
  InfoKey,
  { title: string; description: string; icon: ElementType }
> = {
  language: {
    title: 'Bahasa Antarmuka',
    description:
      'Bismillah Kelar saat ini menggunakan Bahasa Indonesia sebagai bahasa utama. Dukungan bahasa lainnya dapat ditambahkan pada pengembangan berikutnya.',
    icon: Languages,
  },
  calendar: {
    title: 'Hari Awal Pekan',
    description:
      'Kalender menggunakan hari Senin sebagai awal pekan, mengikuti format kalender yang umum digunakan di Indonesia.',
    icon: CalendarDays,
  },
  time: {
    title: 'Format Waktu',
    description:
      'Waktu ditampilkan menggunakan format 24 jam. Pengingat yang ditampilkan pada aplikasi menggunakan acuan WIB.',
    icon: Clock3,
  },
  version: {
    title: 'Bismillah Kelar v0.1.0',
    description:
      'Bismillah Kelar masih dalam tahap pengembangan. Aplikasi ini dibangun untuk membantu mengelola tugas, agenda, fokus, dan progres harian dalam satu ruang produktivitas pribadi.',
    icon: Info,
  },
  privacy: {
    title: 'Privasi & Keamanan',
    description:
      'Data aplikasi disimpan di penyimpanan browser pada perangkat yang digunakan. Data belum disinkronkan ke server. Jika data browser dihapus atau perangkat berganti, data dapat hilang. Karena itu, lakukan ekspor backup secara berkala.',
    icon: ShieldCheck,
  },
  cache: {
    title: 'Cache Sementara',
    description:
      'Bismillah Kelar belum menggunakan penyimpanan cache khusus. Data tugas, agenda, dan pengaturan tidak akan dihapus melalui fitur ini. Gunakan ekspor data untuk membuat salinan cadangan.',
    icon: Trash2,
  },
  feedback: {
    title: 'Umpan Balik',
    description:
      'Punya saran, menemukan kendala, atau ingin mengusulkan fitur baru? Kamu dapat menuliskan masukan dan mengirimkannya melalui aplikasi email di perangkatmu.',
    icon: MessageSquare,
  },
}

function isValidBackup(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false

  const backup = value as Record<string, unknown>

  if (!Array.isArray(backup.tasks)) return false
  if (!backup.agenda || typeof backup.agenda !== 'object') return false
  if (!backup.settings || typeof backup.settings !== 'object') return false

  const settings = backup.settings as Record<string, unknown>

  if (!settings.notifications || typeof settings.notifications !== 'object') {
    return false
  }

  if (
    typeof settings.focusDuration !== 'string' ||
    typeof settings.breakDuration !== 'string' ||
    typeof settings.dailyTarget !== 'string' ||
    typeof settings.greeting !== 'string'
  ) {
    return false
  }

  const validTasks = backup.tasks.every((task) => {
    if (!task || typeof task !== 'object') return false

    const item = task as Record<string, unknown>

    return (
      typeof item.id === 'number' &&
      typeof item.title === 'string' &&
      typeof item.category === 'string' &&
      typeof item.priority === 'string' &&
      typeof item.date === 'string' &&
      typeof item.time === 'string' &&
      typeof item.status === 'string'
    )
  })

  if (!validTasks) return false

  const agenda = backup.agenda as Record<string, unknown>

  const validAgenda = Object.values(agenda).every((items) => {
    if (!Array.isArray(items)) return false

    return items.every((item) => {
      if (!item || typeof item !== 'object') return false

      const entry = item as Record<string, unknown>

      return (
        typeof entry.id === 'number' &&
        typeof entry.title === 'string' &&
        typeof entry.time === 'string' &&
        typeof entry.category === 'string' &&
        typeof entry.color === 'string' &&
        typeof entry.done === 'boolean'
      )
    })
  })

  return validAgenda
}

export default function More() {
  const { data, updateSettings, replaceData } = useAppData()

  const {
    notifications,
    focusDuration,
    breakDuration,
    dailyTarget,
    greeting,
    soundVolume = 1,
  } = data.settings

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showGreetingEditor, setShowGreetingEditor] = useState(false)
  const [draftGreeting, setDraftGreeting] = useState(greeting)

  const [activeOption, setActiveOption] = useState<OptionKey | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [customError, setCustomError] = useState('')

  const [activeInfo, setActiveInfo] = useState<InfoKey | null>(null)
  const [feedbackText, setFeedbackText] = useState('')

  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<AppData | null>(null)

  const [notice, setNotice] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Audio states
  const [soundName, setSoundName] = useState<string | null>(null)
  const [soundLoading, setSoundLoading] = useState(true)
  const [soundProcessing, setSoundProcessing] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)

  // Interaction sound state
  const [interactionSound, setInteractionSound] = useState(
    () => localStorage.getItem(INTERACTION_SOUND_KEY) !== 'false',
  )

  const showNotice = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setNotice({ message, type })
  }

  useEffect(() => {
    let active = true

    async function loadSound() {
      try {
        const sound = await getTimerSound()

        if (active) {
          setSoundName(sound?.name ?? null)
        }
      } catch {
        if (active) {
          setNotice({
            message: 'Gagal membaca penyimpanan audio.',
            type: 'error',
          })
        }
      } finally {
        if (active) setSoundLoading(false)
      }
    }

    void loadSound()

    return () => {
      active = false
    }
  }, [])

  // Hentikan preview ketika halaman ditinggalkan
  useEffect(() => {
    return () => {
      stopTimerEndSound()
    }
  }, [])

  const toggleInteractionSound = () => {
    const nextValue = !interactionSound

    setInteractionSound(nextValue)

    localStorage.setItem(
      INTERACTION_SOUND_KEY,
      String(nextValue),
    )

    showNotice(
      nextValue
        ? 'Efek suara interaksi diaktifkan.'
        : 'Efek suara interaksi dinonaktifkan.',
    )
  }

  const optionSettings: Record<
    OptionKey,
    {
      title: string
      description: string
      current: string
      options: string[]
      unit: string
      label: string
      min: number
      max: number
      save: (value: string) => void
    }
  > = {
    focus: {
      title: 'Durasi Standar Fokus',
      description: 'Pilih durasi untuk satu sesi fokus.',
      current: focusDuration,
      options: ['15 Menit', '25 Menit', '30 Menit', '45 Menit', '60 Menit'],
      unit: 'Menit',
      label: 'Durasi fokus',
      min: 1,
      max: 1440,
      save: (value) => updateSettings({ focusDuration: value }),
    },
    break: {
      title: 'Istirahat Singkat',
      description: 'Pilih jeda antar sesi fokus.',
      current: breakDuration,
      options: ['5 Menit', '10 Menit', '15 Menit'],
      unit: 'Menit',
      label: 'Durasi istirahat',
      min: 1,
      max: 1440,
      save: (value) => updateSettings({ breakDuration: value }),
    },
    target: {
      title: 'Target Tugas Harian',
      description: 'Tentukan jumlah target yang ingin diselesaikan.',
      current: dailyTarget,
      options: ['1 - 2 Target', '3 - 5 Target', '6 - 8 Target'],
      unit: 'Target',
      label: 'Jumlah target harian',
      min: 1,
      max: 100,
      save: (value) => updateSettings({ dailyTarget: value }),
    },
  }

  const selectedOption = activeOption
    ? optionSettings[activeOption]
    : null

  const openOption = (key: OptionKey) => {
    const current = optionSettings[key].current
    const number = current.match(/\d+/)?.[0] ?? ''

    setCustomValue(number)
    setCustomError('')
    setActiveOption(key)
  }

  const toggleNotification = (
    key: keyof typeof notifications,
  ) => {
    updateSettings({
      notifications: {
        ...notifications,
        [key]: !notifications[key],
      },
    })
  }

  const saveGreeting = () => {
    if (!draftGreeting.trim()) return

    updateSettings({
      greeting: draftGreeting.trim(),
    })

    setShowGreetingEditor(false)
    showNotice('Sapaan beranda berhasil diperbarui.')
  }

  const saveCustomOption = () => {
    if (!selectedOption) return

    const value = Number(customValue)

    if (
      !Number.isInteger(value) ||
      value < selectedOption.min ||
      value > selectedOption.max
    ) {
      setCustomError(
        `Masukkan angka bulat antara ${selectedOption.min}–${selectedOption.max}.`,
      )
      return
    }

    selectedOption.save(`${value} ${selectedOption.unit}`)
    setActiveOption(null)
    setCustomError('')
    showNotice('Personalisasi berhasil disimpan.')
  }

  // Impor MP3
  const handleSoundFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    const isMp3 =
      file.type === 'audio/mpeg' ||
      file.type === 'audio/mp3' ||
      file.name.toLowerCase().endsWith('.mp3')

    if (!isMp3) {
      showNotice('Format audio harus berupa file MP3.', 'error')
      event.target.value = ''
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      showNotice('Ukuran MP3 maksimal 15 MB.', 'error')
      event.target.value = ''
      return
    }

    setSoundProcessing(true)

    try {
      stopTimerEndSound()
      setIsPreviewing(false)

      await saveTimerSound(file)
      setSoundName(file.name)
      showNotice('Suara timer berhasil disimpan.')
    } catch {
      showNotice('Gagal menyimpan file MP3.', 'error')
    } finally {
      setSoundProcessing(false)
      event.target.value = ''
    }
  }

  // Preview MP3
  const previewSound = () => {
    if (!soundName) {
      showNotice('Impor MP3 terlebih dahulu.', 'error')
      return
    }

    if (isPreviewing) {
      stopTimerEndSound()
      setIsPreviewing(false)
      return
    }

    try {
      const started = playTimerEndSound(
        soundVolume,
        setIsPreviewing,
      )

      if (!started) {
        setIsPreviewing(false)
        showNotice('Preview audio tidak dapat diputar.', 'error')
        return
      }

      showNotice('Preview audio diputar.')
    } catch {
      setIsPreviewing(false)
      showNotice('Preview audio gagal diputar.', 'error')
    }
  }

  // Hapus MP3
  const removeSound = async () => {
    setSoundProcessing(true)

    try {
      stopTimerEndSound()
      setIsPreviewing(false)

      await deleteTimerSound()
      setSoundName(null)
      showNotice('MP3 dihapus. Suara bawaan akan digunakan.')
    } catch {
      showNotice('Gagal menghapus file MP3.', 'error')
    } finally {
      setSoundProcessing(false)
    }
  }

  // Atur volume timer
  const handleVolumeChange = (value: number) => {
    updateSettings({
      soundVolume: value,
    })
  }

  const exportData = () => {
    try {
      const fileContent = JSON.stringify(data, null, 2)
      const blob = new Blob([fileContent], {
        type: 'application/json',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `bismillah-kelar-${new Date()
        .toISOString()
        .slice(0, 10)}.json`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
      showNotice('Backup data berhasil diunduh.')
    } catch {
      showNotice('Gagal mengekspor data.', 'error')
    }
  }

  const handleBackupFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    try {
      const content = await file.text()
      const parsed: unknown = JSON.parse(content)

      if (!isValidBackup(parsed)) {
        showNotice(
          'File tidak sesuai dengan format backup Bismillah Kelar.',
          'error',
        )
        return
      }

      setPendingBackup(parsed)
      setShowRestoreConfirm(true)
    } catch {
      showNotice(
        'File tidak dapat dibaca. Pastikan file JSON tidak rusak.',
        'error',
      )
    } finally {
      event.target.value = ''
    }
  }

  const restoreBackup = () => {
    if (!pendingBackup) return

    replaceData(pendingBackup)
    setPendingBackup(null)
    setShowRestoreConfirm(false)
    showNotice('Data berhasil dipulihkan dari backup.')
  }

  const sendFeedback = () => {
    if (!feedbackText.trim()) return

    const subject = encodeURIComponent(
      'Umpan Balik Bismillah Kelar',
    )
    const body = encodeURIComponent(feedbackText.trim())

    window.location.href = `mailto:?subject=${subject}&body=${body}`
    setActiveInfo(null)
    setFeedbackText('')
  }

  return (
    <div className="space-y-7 pb-5">
      {notice && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
            notice.type === 'success'
              ? 'border-[#7eae8d] bg-[#e5f5e9] text-[#385a47]'
              : 'border-[#d99a8c] bg-[#fff0ec] text-[#8b4436]'
          }`}
        >
          {notice.type === 'success' ? (
            <Check size={17} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
          )}
          <p className="flex-1">{notice.message}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Tutup pemberitahuan"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* PROFILE */}
      <section className="rounded-2xl border border-[#252525] bg-[#D9CCFF] p-4 shadow-[3px_3px_0px_#252525]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#252525] bg-[#fffaf1]">
            <UserRound size={27} />
          </div>

          <div className="flex-1">
            <p className="text-xs font-semibold text-[#51476b]">
              Ruang produktivitas pribadi
            </p>
            <h2 className="text-xl font-extrabold">Zayy</h2>
            <p className="text-xs text-[#51476b]">
              Satu langkah kecil setiap hari.
            </p>
          </div>

          <Sparkles size={22} />
        </div>

        <div className="mt-4 rounded-xl bg-white/50 px-3 py-2">
          <p className="text-xs font-medium text-[#51476b]">
            Sapaan beranda
          </p>
          <p className="text-sm font-bold">{greeting}</p>
        </div>
      </section>

      {/* PREFERENCES */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Preferensi aplikasi
        </h3>

        <div className="divide-y divide-[#eee8df]">
          <SettingItem
            icon={Languages}
            title="Bahasa Antarmuka"
            description="Bahasa yang digunakan aplikasi"
            value="Indonesia"
            onClick={() => setActiveInfo('language')}
          />

          <SettingItem
            icon={CalendarDays}
            title="Hari Awal Pekan"
            description="Orientasi kalender mingguan"
            value="Senin"
            onClick={() => setActiveInfo('calendar')}
          />

          <SettingItem
            icon={Clock3}
            title="Format Waktu"
            description="Standar waktu Indonesia"
            value="24 Jam WIB"
            onClick={() => setActiveInfo('time')}
          />
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
            Notifikasi & Pengingat
          </h3>
          <span className="text-[10px] text-[#8b8177]">
            Atur preferensimu
          </span>
        </div>

        <div className="divide-y divide-[#eee8df]">
          <ToggleItem
            icon={Sunrise}
            title="Pengingat Tugas Harian"
            description="Pukul 07:00 WIB"
            checked={notifications.daily}
            onChange={() => toggleNotification('daily')}
          />

          <ToggleItem
            icon={AlertCircle}
            title="Batas Waktu & Deadline"
            description="2 jam sebelum tenggat"
            checked={notifications.deadline}
            onChange={() => toggleNotification('deadline')}
          />

          <ToggleItem
            icon={Timer}
            title="Sesi Fokus (Pomodoro)"
            description="Pengingat sesi fokus dan istirahat"
            checked={notifications.focus}
            onChange={() => toggleNotification('focus')}
          />

          <ToggleItem
            icon={Moon}
            title="Refleksi Malam Hari"
            description="Pukul 21:30 WIB"
            checked={notifications.reflection}
            onChange={() => toggleNotification('reflection')}
          />

          <ToggleItem
            icon={Heart}
            title="Pengingat Kebiasaan"
            description="Tilawah, minum air, peregangan"
            checked={notifications.habits}
            onChange={() => toggleNotification('habits')}
          />
        </div>

        <p className="mt-2 rounded-xl bg-[#fff2d5] p-3 text-xs leading-relaxed text-[#77664a]">
          Preferensi pengingat tersimpan di perangkat. Notifikasi
          perangkat belum diaktifkan.
        </p>
      </section>

      {/* FOCUS SETTINGS */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Personalisasi Fokus & Target
        </h3>

        <div className="divide-y divide-[#eee8df]">
          <SettingItem
            icon={Target}
            title="Durasi Standar Fokus"
            description="Satu interval belajar intensif"
            value={focusDuration}
            onClick={() => openOption('focus')}
          />

          <SettingItem
            icon={Coffee}
            title="Istirahat Singkat"
            description="Jeda antar sesi fokus"
            value={breakDuration}
            onClick={() => openOption('break')}
          />

          <SettingItem
            icon={Target}
            title="Target Tugas Harian"
            description="Target produktivitas harian"
            value={dailyTarget}
            onClick={() => openOption('target')}
          />

          <SettingItem
            icon={Hand}
            title="Sapaan Beranda"
            description={greeting}
            onClick={() => {
              setDraftGreeting(greeting)
              setShowGreetingEditor(true)
            }}
          />
        </div>
      </section>

      {/* TIMER SOUND */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Suara Timer Pomodoro
        </h3>

        <div className="rounded-2xl border border-[#252525] bg-[#D9CCFF] p-4 shadow-[3px_3px_0px_#252525]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#252525] bg-white">
              <Music size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">
                Suara saat sesi selesai
              </p>
              <p className="text-xs text-[#625779]">
                Gunakan MP3 pilihanmu sendiri
              </p>
            </div>
          </div>

          {/* ACTIVE AUDIO */}
          <div className="mt-4 rounded-xl border border-[#252525]/20 bg-white/60 p-3">
            <p className="text-xs font-bold text-[#625779]">
              FILE AUDIO AKTIF
            </p>

            {soundLoading ? (
              <p className="mt-2 text-xs text-[#888078]">
                Memeriksa penyimpanan audio...
              </p>
            ) : soundName ? (
              <div className="mt-2 flex items-center gap-2">
                <Music size={16} className="shrink-0" />
                <p className="min-w-0 flex-1 truncate text-sm font-bold">
                  {soundName}
                </p>
                <span className="rounded-lg bg-[#BDECCF] px-2 py-1 text-[10px] font-bold">
                  MP3
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#777078]">
                Belum ada MP3. Aplikasi menggunakan suara beep bawaan.
              </p>
            )}
          </div>

          {/* VOLUME SLIDER */}
          <div className="mt-4 rounded-xl border border-[#252525]/20 bg-white/60 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={17} />
                <p className="text-xs font-extrabold">
                  Volume Suara Timer
                </p>
              </div>

              <span className="rounded-lg bg-[#BDECCF] px-2 py-1 text-xs font-extrabold tabular-nums">
                {Math.round(soundVolume * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(event) =>
                handleVolumeChange(Number(event.target.value))
              }
              className="h-2 w-full cursor-pointer accent-[#625779]"
              aria-label="Volume suara timer"
            />

            <div className="mt-2 flex justify-between text-[10px] text-[#777078]">
              <span>Diam</span>
              <span>50%</span>
              <span>Maksimal</span>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-[#756b80]">
              Volume ini berlaku untuk suara MP3 maupun suara timer
              bawaan ketika sesi Pomodoro selesai.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,audio/mpeg,audio/mp3"
            className="hidden"
            onChange={handleSoundFile}
          />

          {/* AUDIO ACTIONS */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={soundProcessing || soundLoading}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#252525] bg-white px-3 py-2.5 text-xs font-extrabold shadow-[2px_2px_0px_#252525] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
            >
              {soundProcessing ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {soundName ? 'Ganti MP3' : 'Impor MP3'}
            </button>

            <button
              type="button"
              disabled={!soundName || soundProcessing || soundLoading}
              onClick={previewSound}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#252525] bg-[#BDECCF] px-3 py-2.5 text-xs font-extrabold shadow-[2px_2px_0px_#252525] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
            >
              {isPreviewing ? (
                <Square size={15} />
              ) : (
                <Play size={16} />
              )}
              {isPreviewing ? 'Stop Preview' : 'Preview'}
            </button>
          </div>

          {soundName && (
            <button
              type="button"
              disabled={soundProcessing}
              onClick={removeSound}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#252525] bg-[#fff0ec] px-3 py-2.5 text-xs font-bold text-[#8b4436] transition hover:bg-[#ffe3dc] disabled:opacity-50"
            >
              <Trash2 size={15} />
              Hapus MP3
            </button>
          )}
        </div>

        <p className="mt-2 rounded-xl bg-[#fff2d5] p-3 text-xs leading-relaxed text-[#77664a]">
          File MP3 disimpan di IndexedDB browser pada perangkat ini,
          terpisah dari backup JSON. Suara digunakan saat sesi fokus
          maupun istirahat selesai. Kamu dapat mengatur volumenya dan
          menghentikan preview kapan saja.
        </p>
      </section>

      {/* INTERACTION SOUND */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Efek Suara Aplikasi
        </h3>

        <div className="rounded-2xl border border-[#252525] bg-[#FFE69A] p-3 shadow-[3px_3px_0px_#252525]">
          <ToggleItem
            icon={Volume2}
            title="Suara Interaksi"
            description="Efek suara saat klik menu, tombol, dan pilihan"
            checked={interactionSound}
            onChange={toggleInteractionSound}
          />

          <div className="mx-2 border-t border-[#252525]/15 pt-3">
            <div className="flex items-center gap-2 text-xs text-[#75664e]">
              <Info size={15} />
              <p>
                {interactionSound
                  ? 'Efek suara interaksi sedang aktif.'
                  : 'Efek suara interaksi sedang dinonaktifkan.'}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-2 rounded-xl bg-[#fff2d5] p-3 text-xs leading-relaxed text-[#77664a]">
          Pengaturan ini hanya mengontrol suara interaksi antarmuka.
          Suara timer Pomodoro tetap mengikuti pengaturan audio timer.
        </p>
      </section>

      {/* DATA */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Data & Cadangan
        </h3>

        <div className="rounded-2xl border border-[#252525] bg-[#BDECCF] p-4 shadow-[3px_3px_0px_#252525]">
          <div className="flex items-center gap-2">
            <Database size={19} />
            <p className="text-sm font-extrabold">
              Penyimpanan lokal
            </p>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-[#385a47]">
            Data disimpan secara lokal pada perangkat ini melalui
            penyimpanan browser. Data belum disinkronkan ke server.
          </p>
        </div>

        <input
          type="file"
          accept=".json,application/json"
          className="hidden"
          id="backup-file-input"
          onChange={handleBackupFile}
        />

        <div className="mt-2 divide-y divide-[#eee8df]">
          <SettingItem
            icon={Download}
            title="Ekspor Data Pribadi"
            description="Unduh data dalam format JSON"
            onClick={exportData}
          />

          <SettingItem
            icon={Upload}
            title="Cadangkan & Pulihkan"
            description="Pilih file backup untuk memulihkan data"
            onClick={() =>
              document.getElementById('backup-file-input')?.click()
            }
          />

          <SettingItem
            icon={Trash2}
            title="Bersihkan Cache Sementara"
            description="Informasi pengelolaan penyimpanan"
            onClick={() => setActiveInfo('cache')}
          />
        </div>
      </section>

      {/* ABOUT */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Tentang Bismillah Kelar
        </h3>

        <div className="divide-y divide-[#eee8df]">
          <SettingItem
            icon={Info}
            title="Versi Aplikasi"
            description="Versi pengembangan"
            value="v0.1.0"
            onClick={() => setActiveInfo('version')}
          />

          <SettingItem
            icon={ShieldCheck}
            title="Privasi & Keamanan"
            description="Informasi pengelolaan data"
            onClick={() => setActiveInfo('privacy')}
          />
        </div>

        <div className="mt-3 rounded-2xl bg-[#fff2d5] p-4">
          <div className="flex items-center gap-2">
            <Heart size={18} />
            <p className="text-sm font-extrabold">Filosofi & Doa</p>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-[#75664e]">
            Dibuat dengan niat baik untuk menemani perjalanan belajarmu
            hingga tuntas, satu tugas dalam satu waktu dengan tenang.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveInfo('feedback')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#252525] bg-[#FFE69A] px-4 py-3 text-sm font-extrabold shadow-[3px_3px_0px_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <MessageSquare size={17} />
          Beri Umpan Balik
        </button>
      </section>

      {/* FOOTER */}
      <footer className="flex flex-col items-center gap-2 pt-3 text-center">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#8b8177]">
          <Sparkles size={14} />
          Bismillah Kelar
          <Sparkles size={14} />
        </div>

        <p className="text-xs text-[#999188]">
          Ditenagai ketekunan & doa Zayy.
        </p>

        <p className="text-[10px] text-[#aaa198]">
          Tanpa beban, fokus bertumbuh.
        </p>
      </footer>

      {/* OPTION MODAL */}
      {selectedOption && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-5 py-6"
          onClick={() => setActiveOption(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="option-modal-title"
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[#252525] bg-[#fffaf1] p-5 shadow-[4px_4px_0px_#252525]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3
                  id="option-modal-title"
                  className="text-lg font-extrabold"
                >
                  {selectedOption.title}
                </h3>
                <p className="mt-1 text-xs text-[#888078]">
                  {selectedOption.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveOption(null)}
                aria-label="Tutup pilihan"
                className="rounded-lg p-1 transition hover:bg-[#eee8df]"
              >
                <X size={19} />
              </button>
            </div>

            <p className="mb-2 text-xs font-bold text-[#888078]">
              PILIHAN YANG TERSEDIA
            </p>

            <div className="space-y-2">
              {selectedOption.options.map((option) => {
                const isSelected = selectedOption.current === option

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      selectedOption.save(option)
                      setActiveOption(null)
                      showNotice('Personalisasi berhasil disimpan.')
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-[#252525] bg-[#BDECCF] shadow-[2px_2px_0px_#252525]'
                        : 'border-[#e5ddd1] bg-white hover:bg-[#f5f0e7]'
                    }`}
                  >
                    <span className="text-sm font-bold">{option}</span>

                    {isSelected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#252525] bg-white">
                        <Check size={15} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e5ddd1]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#999188]">
                atau atur sendiri
              </span>
              <div className="h-px flex-1 bg-[#e5ddd1]" />
            </div>

            <label className="mb-2 block text-xs font-bold">
              {selectedOption.label}
            </label>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={selectedOption.min}
                max={selectedOption.max}
                step={1}
                value={customValue}
                onChange={(event) => {
                  setCustomValue(event.target.value)
                  setCustomError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveCustomOption()
                }}
                placeholder="Masukkan angka"
                className="min-w-0 flex-1 rounded-xl border border-[#d8d0c5] bg-white px-3 py-3 text-sm outline-none focus:border-[#252525]"
              />

              <span className="rounded-xl bg-[#eee8df] px-3 py-3 text-xs font-bold">
                {selectedOption.unit}
              </span>
            </div>

            <p className="mt-1 text-[10px] text-[#999188]">
              Masukkan angka {selectedOption.min}–{selectedOption.max}.
            </p>

            {customError && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                {customError}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveOption(null)}
                className="flex-1 rounded-xl border border-[#252525] px-3 py-2.5 text-sm font-bold"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={saveCustomOption}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#252525] bg-[#BDECCF] px-3 py-2.5 text-sm font-bold shadow-[2px_2px_0px_#252525]"
              >
                <Check size={16} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GREETING EDITOR */}
      {showGreetingEditor && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-5"
          onClick={() => setShowGreetingEditor(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[#252525] bg-[#fffaf1] p-5 shadow-[4px_4px_0px_#252525]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-extrabold">Ubah Sapaan Beranda</h3>
              <button
                type="button"
                onClick={() => setShowGreetingEditor(false)}
                aria-label="Tutup"
              >
                <X size={19} />
              </button>
            </div>

            <textarea
              value={draftGreeting}
              onChange={(event) => setDraftGreeting(event.target.value)}
              maxLength={100}
              rows={3}
              className="w-full resize-none rounded-xl border border-[#d8d0c5] bg-white p-3 text-sm outline-none focus:border-[#252525]"
              placeholder="Tulis sapaan untuk dirimu..."
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowGreetingEditor(false)}
                className="flex-1 rounded-xl border border-[#252525] px-3 py-2 text-sm font-bold"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={saveGreeting}
                disabled={!draftGreeting.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#252525] bg-[#BDECCF] px-3 py-2 text-sm font-bold disabled:opacity-50"
              >
                <Check size={16} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INFORMATION MODAL */}
      {activeInfo && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-5 py-6"
          onClick={() => setActiveInfo(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[#252525] bg-[#fffaf1] p-5 shadow-[4px_4px_0px_#252525]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eee8df]">
                  {(() => {
                    const Icon = infoContent[activeInfo].icon
                    return <Icon size={20} />
                  })()}
                </div>
                <h3 className="font-extrabold">
                  {infoContent[activeInfo].title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveInfo(null)}
                aria-label="Tutup"
              >
                <X size={19} />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-[#6f675f]">
              {infoContent[activeInfo].description}
            </p>

            {activeInfo === 'feedback' && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-bold">
                  Tulis masukanmu
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  rows={4}
                  maxLength={1500}
                  placeholder="Ceritakan saran, ide, atau kendala yang kamu temukan..."
                  className="w-full resize-none rounded-xl border border-[#d8d0c5] bg-white p-3 text-sm outline-none focus:border-[#252525]"
                />
                <p className="mt-1 text-right text-[10px] text-[#999188]">
                  {feedbackText.length}/1500
                </p>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveInfo(null)}
                className="flex-1 rounded-xl border border-[#252525] px-3 py-2.5 text-sm font-bold"
              >
                Tutup
              </button>

              {activeInfo === 'feedback' && (
                <button
                  type="button"
                  onClick={sendFeedback}
                  disabled={!feedbackText.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#252525] bg-[#FFE69A] px-3 py-2.5 text-sm font-bold disabled:opacity-50"
                >
                  <Mail size={16} />
                  Kirim
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION */}
      {showRestoreConfirm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-5 py-6"
          onClick={() => {
            setShowRestoreConfirm(false)
            setPendingBackup(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[#252525] bg-[#fffaf1] p-5 shadow-[4px_4px_0px_#252525]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#BDECCF]">
              <FileJson size={22} />
            </div>

            <h3 className="text-lg font-extrabold">
              Pulihkan Data?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#6f675f]">
              Data saat ini akan digantikan dengan isi file backup yang
              dipilih. Pastikan kamu sudah memiliki salinan data terbaru
              sebelum melanjutkan.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreConfirm(false)
                  setPendingBackup(null)
                }}
                className="flex-1 rounded-xl border border-[#252525] px-3 py-2.5 text-sm font-bold"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={restoreBackup}
                className="flex-1 rounded-xl border border-[#252525] bg-[#BDECCF] px-3 py-2.5 text-sm font-bold shadow-[2px_2px_0px_#252525]"
              >
                Pulihkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
