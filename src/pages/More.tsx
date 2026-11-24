import {
  useEffect,
  useId,
  useRef,
  useState,
  type ElementType,
  type ChangeEvent,
} from 'react'

import { createPortal } from 'react-dom'

import {
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
  Database,
  Download,
  Upload,
  Trash2,
  Info,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  ChevronDown,
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
  Pencil,
} from 'lucide-react'

import { useAppData } from '../hooks/AppContext'
import type { AppData } from '../types/app'
import { DEFAULT_PROFILE_PHOTO_URL } from '../components/layout/AppHeader'
import {
  DEFAULT_ALARM_TONE_KEY,
  DEFAULT_ALARM_TONES,
  type DefaultToneId,
  type SelectedToneId,
  getTimerSound,
  saveTimerSound,
  deleteTimerSound,
  playTimerEndSound,
  stopTimerEndSound,
} from '../lib/audioStorage'

const INTERACTION_SOUND_KEY = 'bismillah-kelar-interaction-sound'
const defaultAlarmTones = Object.values(DEFAULT_ALARM_TONES)
function MarqueeText({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const rawId = useId()
  const animName = `marquee-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const [metrics, setMetrics] = useState<{
    overflow: boolean
    shift: number
    totalDuration: number
    pausePercent: number
  }>({
    overflow: false,
    shift: 0,
    totalDuration: 0,
    pausePercent: 0,
  })

  const gap = 36

  useEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const measure = () => {
      const containerWidth = container.clientWidth
      const textWidth = textEl.scrollWidth

      if (containerWidth > 0 && textWidth > containerWidth + 1) {
        const shift = textWidth + gap
        const pauseSeconds = 2
        const scrollSeconds = Math.max(3, shift / 38)
        const totalDuration = pauseSeconds + scrollSeconds
        const pausePercent = Number(
          ((pauseSeconds / totalDuration) * 100).toFixed(2),
        )

        setMetrics({
          overflow: true,
          shift,
          totalDuration,
          pausePercent,
        })
      } else {
        setMetrics((prev) =>
          prev.overflow
            ? { overflow: false, shift: 0, totalDuration: 0, pausePercent: 0 }
            : prev,
        )
      }
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(textEl)

    return () => observer.disconnect()
  }, [text])

  return (
    <div
      ref={containerRef}
      className={`min-w-0 flex-1 overflow-hidden ${className}`}
    >
      {metrics.overflow && (
        <style>{`
          @keyframes ${animName} {
            0%, ${metrics.pausePercent}% {
              transform: translate3d(0, 0, 0);
            }
            100% {
              transform: translate3d(-${metrics.shift}px, 0, 0);
            }
          }
        `}</style>
      )}

      <div
        className="inline-flex whitespace-nowrap will-change-transform"
        style={
          metrics.overflow
            ? {
                animation: `${animName} ${metrics.totalDuration.toFixed(2)}s linear infinite`,
              }
            : undefined
        }
      >
        <span ref={textRef} className="inline-block whitespace-nowrap">
          {text}
        </span>

        {metrics.overflow && (
          <span
            aria-hidden="true"
            className="inline-block whitespace-nowrap"
            style={{ paddingLeft: `${gap}px` }}
          >
            {text}
          </span>
        )}
      </div>
    </div>
  )
}

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
        className={`relative h-6 w-12 shrink-0 rounded-full border-[1.5px] border-[#252525] p-0.5 shadow-[2px_2px_0px_#252525] transition ${
          checked ? 'bg-[#4ADE80]' : 'bg-[#EF4444]'
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

type MoreProps = {
  onEditProfile: () => void
  scrollToNotificationsTick?: number
}

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
    title: 'Bismillah Kelar v0.9.5',
    description:
      'Bismillah Kelar masih dalam tahap pengembangan. Aplikasi ini dibangun untuk membantu mengelola target dan tugas, agenda, fokus, dan progres harian dalam satu ruang produktivitas pribadi.',
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
      'Bismillah Kelar belum menggunakan penyimpanan cache khusus. Data target dan tugas, agenda, dan pengaturan tidak akan dihapus melalui fitur ini. Gunakan ekspor data untuk membuat salinan cadangan.',
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

export default function More({
  onEditProfile,
  scrollToNotificationsTick = 0,
}: MoreProps) {
  const {
    data,
    profilePhotoUrl,
    updateSettings,
    replaceData,
  } = useAppData()

  const profileName = data.profile.name.trim() || 'Teman'
  const avatarSrc = profilePhotoUrl || DEFAULT_PROFILE_PHOTO_URL

  const {
    notifications,
    focusDuration,
    breakDuration,
    dailyTarget,
    greeting,
    soundVolume = 1,
  } = data.settings

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const notificationsSectionRef = useRef<HTMLElement>(null)

  const [activeOption, setActiveOption] = useState<OptionKey | null>(null)
  const [draftPreset, setDraftPreset] = useState<string | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [customError, setCustomError] = useState('')

  const [activeInfo, setActiveInfo] = useState<InfoKey | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [showLocalStorageDetail, setShowLocalStorageDetail] = useState(false)
  const [showPrayerEasterEgg, setShowPrayerEasterEgg] = useState(false)

  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<AppData | null>(null)

  const [notice, setNotice] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [selectedTone, setSelectedTone] = useState<SelectedToneId>(
    () => {
      const saved = localStorage.getItem(DEFAULT_ALARM_TONE_KEY)
      if (
        saved === 'tone-2' ||
        saved === 'tone-3' ||
        saved === 'custom'
      ) {
        return saved
      }
      return 'tone-1'
    },
  )

  const [soundName, setSoundName] = useState<string | null>(null)
  const [soundLoading, setSoundLoading] = useState(true)
  const [soundProcessing, setSoundProcessing] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const isPreviewingRef = useRef(false)

  const [interactionSound, setInteractionSound] = useState(
    () => localStorage.getItem(INTERACTION_SOUND_KEY) !== 'false',
  )

  // Animasi scroll otomatis dari kartu profil atas ke tengah bagian Notifikasi & Pengingat
  useEffect(() => {
    if (!scrollToNotificationsTick) return

    window.scrollTo({ top: 0, behavior: 'auto' })

    const timer = window.setTimeout(() => {
      notificationsSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 320)

    return () => window.clearTimeout(timer)
  }, [scrollToNotificationsTick])

  const showNotice = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setNotice({ message, type })
  }

  const stopDefaultPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
      previewAudioRef.current = null
    }
  }

  useEffect(() => {
    let active = true

    async function loadSound() {
      try {
        const sound = await getTimerSound()

        if (active) {
          const loadedName = sound?.name ?? null
          setSoundName(loadedName)

          if (!loadedName && localStorage.getItem(DEFAULT_ALARM_TONE_KEY) === 'custom') {
            setSelectedTone('tone-1')
            localStorage.setItem(DEFAULT_ALARM_TONE_KEY, 'tone-1')
          }
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

  useEffect(() => {
    isPreviewingRef.current = isPreviewing
  }, [isPreviewing])

  useEffect(() => {
    return () => {
      if (isPreviewingRef.current) {
        stopTimerEndSound()
        stopDefaultPreview()
      }
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
      options: [
        '15 Menit',
        '25 Menit',
        '30 Menit',
        '45 Menit',
        '60 Menit',
        '90 Menit',
      ],
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
      options: ['5 Menit', '10 Menit', '15 Menit', '20 Menit'],
      unit: 'Menit',
      label: 'Durasi istirahat',
      min: 1,
      max: 1440,
      save: (value) => updateSettings({ breakDuration: value }),
    },
    target: {
      title: 'Target Harian',
      description: 'Tentukan jumlah target yang ingin diselesaikan.',
      current: dailyTarget,
      options: [
        '1 - 2 Target',
        '3 - 5 Target',
        '6 - 8 Target',
        '9 - 10 Target',
      ],
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
    const setting = optionSettings[key]
    const isPreset = setting.options.includes(setting.current)

    setDraftPreset(isPreset ? setting.current : null)
    setCustomValue(
      isPreset ? '' : (setting.current.match(/\d+/)?.[0] ?? ''),
    )
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

  const saveCustomOption = () => {
    if (!selectedOption) return

    if (draftPreset) {
      selectedOption.save(draftPreset)
      setActiveOption(null)
      setDraftPreset(null)
      setCustomError('')
      showNotice('Personalisasi berhasil disimpan.')
      return
    }

    const value = Number(customValue)

    if (
      !customValue.trim() ||
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
    setDraftPreset(null)
    setCustomError('')
    showNotice('Personalisasi berhasil disimpan.')
  }

  const selectTone = (toneId: SelectedToneId) => {
    stopTimerEndSound()
    stopDefaultPreview()
    setIsPreviewing(false)

    setSelectedTone(toneId)
    localStorage.setItem(DEFAULT_ALARM_TONE_KEY, toneId)

    if (toneId === 'custom') {
      showNotice(`Nada alarm diubah ke ${soundName ?? 'MP3 kustom'}.`)
    } else {
      const chosen = defaultAlarmTones.find((tone) => tone.id === toneId)
      showNotice(`Nada alarm diubah ke ${chosen?.name ?? 'nada default'}.`)
    }
  }

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
      stopDefaultPreview()
      setIsPreviewing(false)

      await saveTimerSound(file)
      setSoundName(file.name)
      setSelectedTone('custom')
      localStorage.setItem(DEFAULT_ALARM_TONE_KEY, 'custom')
      showNotice('Suara timer berhasil disimpan.')
    } catch {
      showNotice('Gagal menyimpan file MP3.', 'error')
    } finally {
      setSoundProcessing(false)
      event.target.value = ''
    }
  }

  const playDefaultTonePreview = async (toneId: DefaultToneId) => {
    stopDefaultPreview()

    const tone =
      defaultAlarmTones.find((item) => item.id === toneId) ??
      defaultAlarmTones[0]

    const audio = new Audio(tone.url)
    audio.volume = Math.min(1, Math.max(0, soundVolume))
    previewAudioRef.current = audio

    audio.onended = () => {
      setIsPreviewing(false)
      previewAudioRef.current = null
    }

    try {
      await audio.play()
      setIsPreviewing(true)
      showNotice(`Memutar preview: ${tone.name}`)
    } catch {
      setIsPreviewing(false)
      previewAudioRef.current = null
      showNotice('Preview audio gagal diputar.', 'error')
    }
  }

  const previewSound = async () => {
    if (isPreviewing) {
      stopTimerEndSound()
      stopDefaultPreview()
      setIsPreviewing(false)
      return
    }

    if (selectedTone !== 'custom' || !soundName) {
      const toneToPlay: DefaultToneId =
        selectedTone === 'custom' ? 'tone-1' : selectedTone
      await playDefaultTonePreview(toneToPlay)
      return
    }

    try {
      const started = await playTimerEndSound(
        soundVolume,
        setIsPreviewing,
      )

      if (!started) {
        setIsPreviewing(false)
        showNotice('Preview audio tidak dapat diputar.', 'error')
        return
      }

      showNotice(`Memutar preview: ${soundName}`)
    } catch {
      setIsPreviewing(false)
      showNotice('Preview audio gagal diputar.', 'error')
    }
  }

  const removeSound = async () => {
    setSoundProcessing(true)

    try {
      stopTimerEndSound()
      stopDefaultPreview()
      setIsPreviewing(false)

      await deleteTimerSound()
      setSoundName(null)
      if (selectedTone === 'custom') {
        setSelectedTone('tone-1')
        localStorage.setItem(DEFAULT_ALARM_TONE_KEY, 'tone-1')
      }
      showNotice('MP3 dihapus. Nada bawaan aktif kembali.')
    } catch {
      showNotice('Gagal menghapus file MP3.', 'error')
    } finally {
      setSoundProcessing(false)
    }
  }

  const handleVolumeChange = (value: number) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = Math.min(1, Math.max(0, value))
    }

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
    const message = feedbackText.trim()

    if (!message) return

    const recipient = 'zetzayn@students.unnes.ac.id'
    const subject = encodeURIComponent(
      'Umpan Balik Bismillah Kelar',
    )
    const body = encodeURIComponent(message)

    window.location.href =
      `mailto:${recipient}?subject=${subject}&body=${body}`

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

      {/* KARTU PROFIL ATAS */}
      <button
        type="button"
        onClick={onEditProfile}
        aria-label="Edit profil dan sapaan beranda"
        className="block w-full rounded-2xl border-2 border-[#252525] bg-[#D9CCFF] p-4 text-left shadow-[3px_3px_0px_#252525] transition hover:brightness-[0.98] active:translate-y-0.5 active:shadow-none"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#252525] bg-[#fffaf1]">
            <img
              src={avatarSrc}
              alt={`Foto profil ${profileName}`}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-black tracking-tight text-[#252525]">
              {profileName}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-[#51476b]">
              Ketuk untuk edit profil &amp; sapaan
            </p>
          </div>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#252525] bg-white/85">
            <Pencil size={15} />
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-[#252525]/20 bg-white/75 px-3 py-2.5">
          <p className="text-[11px] font-bold text-[#51476b]">
            Sapaan beranda
          </p>
          <p className="mt-0.5 text-sm font-extrabold text-[#252525]">
            {greeting}
          </p>
        </div>
      </button>

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

      {/* NOTIFICATIONS (Target Auto-Scroll ke Tengah Layar) */}
      <section ref={notificationsSectionRef} className="scroll-my-24">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
            Notifikasi &amp; Pengingat
          </h3>
        </div>

        <div className="divide-y divide-[#eee8df]">
          <ToggleItem
            icon={Sunrise}
            title="Pengingat Target Harian"
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
            description="Mengaji, olahraga, tidur 8 jam, dan kebiasaan lainnya"
            checked={notifications.habits}
            onChange={() => toggleNotification('habits')}
          />
        </div>

        <p className="mt-2 rounded-xl bg-[#fff2d5] p-3 text-xs leading-relaxed text-[#77664a]">
          Preferensi pengingat tersimpan di perangkat dan tampil di ikon lonceng header.
        </p>
      </section>

      {/* FOCUS SETTINGS */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Personalisasi Fokus &amp; Target
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
        </div>
      </section>

      {/* NADA ALARM POMODORO */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Nada Alarm Pomodoro
        </h3>

        <div className="rounded-2xl border-2 border-[#252525] bg-[#D9CCFF] p-4 shadow-[3px_3px_0px_#252525]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#252525] bg-white">
              <Music size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">
                Suara saat sesi selesai
              </p>
              <p className="text-xs text-[#625779]">
                Pilih nada default atau impor MP3 sendiri
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#252525]/20 bg-white/75 p-3">
            <p className="mb-2 text-xs font-extrabold text-[#51476b]">
              PILIHAN NADA ALARM
            </p>

            <div className="space-y-1.5">
              {defaultAlarmTones.map((tone) => {
                const isSelected = selectedTone === tone.id

                return (
                  <button
                    key={tone.id}
                    type="button"
                    disabled={soundProcessing || soundLoading}
                    onClick={() => selectTone(tone.id)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl border-[1.5px] px-3 py-2 text-left text-xs font-bold transition ${
                      isSelected
                        ? 'border-[#252525] bg-[#4ADE80] text-[#14532d] shadow-[2px_2px_0_#252525]'
                        : 'border-[#252525]/25 bg-white text-[#252525] hover:border-[#252525]'
                    }`}
                  >
                    <MarqueeText text={tone.name} />
                    {isSelected && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#252525] bg-white text-[#252525]">
                        <Check size={12} strokeWidth={2.8} />
                      </span>
                    )}
                  </button>
                )
              })}

              {soundName && (
                <button
                  type="button"
                  disabled={soundProcessing || soundLoading}
                  onClick={() => selectTone('custom')}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border-[1.5px] px-3 py-2 text-left text-xs font-bold transition ${
                    selectedTone === 'custom'
                      ? 'border-[#252525] bg-[#4ADE80] text-[#14532d] shadow-[2px_2px_0_#252525]'
                      : 'border-[#252525]/25 bg-white text-[#252525] hover:border-[#252525]'
                  }`}
                >
                  <MarqueeText text={soundName} />

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-md border border-[#252525] bg-[#4ADE80] px-1.5 py-0.5 text-[9.5px] font-extrabold text-[#14532d]">
                      MP3
                    </span>

                    {selectedTone === 'custom' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#252525] bg-white text-[#252525]">
                        <Check size={12} strokeWidth={2.8} />
                      </span>
                    )}
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#252525]/20 bg-white/75 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={17} />
                <p className="text-xs font-extrabold">
                  Volume Suara Timer
                </p>
              </div>

              <span className="rounded-lg border border-[#252525] bg-[#4ADE80] px-2 py-0.5 text-xs font-extrabold tabular-nums text-[#14532d]">
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
              style={{
                background: `linear-gradient(to right, #4ADE80 0%, #4ADE80 ${
                  soundVolume * 100
                }%, #e5dfd5 ${soundVolume * 100}%, #e5dfd5 100%)`,
              }}
              className="h-2.5 w-full cursor-pointer appearance-none rounded-full border border-[#252525] accent-[#4ADE80]"
              aria-label="Volume suara timer"
            />

            <div className="mt-2 flex justify-between text-[10px] text-[#777078]">
              <span>Diam</span>
              <span>50%</span>
              <span>Maksimal</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,audio/mpeg,audio/mp3"
            className="hidden"
            onChange={handleSoundFile}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={soundProcessing || soundLoading}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#252525] bg-white px-3 py-2.5 text-xs font-extrabold shadow-[2px_2px_0px_#252525] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
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
              disabled={soundProcessing || soundLoading}
              onClick={previewSound}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#252525] bg-[#4ADE80] px-3 py-2.5 text-xs font-extrabold text-[#14532d] shadow-[2px_2px_0px_#252525] transition hover:bg-[#3ad170] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#252525] bg-[#EF4444] px-3 py-2.5 text-xs font-extrabold text-white shadow-[2px_2px_0_#252525] transition hover:bg-[#DC2626] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
            >
              <Trash2 size={15} />
              Hapus MP3
            </button>
          )}
        </div>
      </section>

      {/* EFEK SUARA APLIKASI */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Efek Suara Aplikasi
        </h3>

        <div className="rounded-2xl border-2 border-[#252525] bg-[#FFE69A] p-3 shadow-[3px_3px_0px_#252525]">
          <ToggleItem
            icon={Volume2}
            title="Suara Interaksi"
            description="Efek suara saat klik menu, tombol, dan pilihan"
            checked={interactionSound}
            onChange={toggleInteractionSound}
          />
        </div>
      </section>

      {/* DATA & CADANGAN */}
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#8b8177]">
          Data &amp; Cadangan
        </h3>

        <button
          type="button"
          onClick={() => setShowLocalStorageDetail((current) => !current)}
          aria-expanded={showLocalStorageDetail}
          className="w-full rounded-2xl border-2 border-[#252525] bg-[#BDECCF] p-4 text-left shadow-[3px_3px_0px_#252525] transition hover:brightness-[0.98] active:translate-y-0.5 active:shadow-none"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#252525] bg-white px-3 py-1 text-xs font-extrabold text-[#1e4620]">
              <Database size={15} />
              Penyimpanan Lokal
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1e4620]">
              {showLocalStorageDetail ? 'Tutup detail' : 'Cara kerja'}
              <ChevronDown
                size={15}
                className={`transition-transform ${
                  showLocalStorageDetail ? 'rotate-180' : ''
                }`}
              />
            </span>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-[#234d2c]">
            Data disimpan secara lokal pada perangkat ini melalui penyimpanan browser dan tetap bisa diakses penuh saat offline.
          </p>

          {showLocalStorageDetail && (
            <div className="mt-3 space-y-2 rounded-xl border border-[#252525]/25 bg-white/85 p-3 text-xs leading-relaxed text-[#252525]">
              <p>
                <strong>1. 100% Offline &amp; Privat:</strong> Target dan tugas, agenda kalender, progres, dan pengaturan tersimpan langsung di memori browser HP/laptop kamu tanpa dikirim ke server mana pun.
              </p>
              <p>
                <strong>2. Media &amp; Audio Lokal:</strong> Foto profil kustom dan file audio MP3 disimpan di database perangkat (IndexedDB) agar tetap responsif tanpa internet.
              </p>
              <p>
                <strong>3. Cadangan Berkala:</strong> Karena data berada di browser perangkat ini, gunakan tombol <em>Ekspor Data Pribadi</em> di bawah sebelum menghapus data browser atau berganti perangkat.
              </p>
            </div>
          )}
        </button>

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
            value="v0.9.5"
            onClick={() => setActiveInfo('version')}
          />

          <SettingItem
            icon={ShieldCheck}
            title="Privasi & Keamanan"
            description="Informasi pengelolaan data"
            onClick={() => setActiveInfo('privacy')}
          />
        </div>

        {/* Kartu Filosofi & Doa */}
        <div
          onClick={() => setShowPrayerEasterEgg((current) => !current)}
          className="mt-3 rounded-2xl border border-[#252525]/20 bg-[#fff2d5] p-4"
        >
          <div className="flex items-center gap-2">
            <Heart
              size={18}
              className="fill-[#EF4444] text-[#EF4444]"
            />
            <p className="text-sm font-extrabold">Filosofi &amp; Doa</p>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-[#5c4c2e]">
            Dirancang sebagai ruang tenang di tengah riuhnya hari—membantumu menuntaskan amanah satu demi satu, dengan hati yang lapang dan langkah yang terarah.
          </p>

          {showPrayerEasterEgg && (
            <p className="mt-2.5 text-xs font-medium text-[#5c4c2e]">
              terima kasih telah berjuang /Z
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setActiveInfo('feedback')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#252525] bg-[#FFE69A] px-4 py-3 text-sm font-extrabold shadow-[3px_3px_0px_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
          Ditenagai ketekunan &amp; doa {profileName}.
        </p>

        <p className="text-[10px] text-[#aaa198]">
          Tanpa beban, fokus bertumbuh.
        </p>
      </footer>

      {/* OPTION MODAL */}
      {selectedOption &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#252525]/40 px-4 py-4 backdrop-blur-sm"
            onClick={() => setActiveOption(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="option-modal-title"
              className="w-full max-w-sm rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-4 shadow-[5px_5px_0px_#252525]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3
                    id="option-modal-title"
                    className="text-base font-extrabold"
                  >
                    {selectedOption.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#888078]">
                    {selectedOption.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveOption(null)}
                  aria-label="Tutup pilihan"
                  className="rounded-lg p-1.5 transition hover:bg-[#eee8df]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {selectedOption.options.map((option) => {
                  const isSelected = draftPreset === option

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setDraftPreset(option)
                        setCustomValue('')
                        setCustomError('')
                      }}
                      className={`flex items-center justify-between rounded-xl border-[1.5px] px-3 py-2.5 text-left transition ${
                        isSelected
                          ? 'border-[#252525] bg-[#BDECCF] shadow-[2px_2px_0px_#252525]'
                          : 'border-[#e5ddd1] bg-white hover:border-[#252525] hover:bg-[#f5f0e7]'
                      }`}
                    >
                      <span className="text-xs font-bold">{option}</span>

                      {isSelected && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#252525] bg-white">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="my-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#e5ddd1]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#999188]">
                  atau atur sendiri
                </span>
                <div className="h-px flex-1 bg-[#e5ddd1]" />
              </div>

              <label className="mb-1.5 block text-xs font-bold">
                {selectedOption.label} ({selectedOption.min}–{selectedOption.max})
              </label>

              <div className="flex items-center gap-2">
                <textarea
                  rows={1}
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={customValue}
                  onChange={(event) => {
                    const digitsOnly = event.target.value.replace(/\D/g, '')
                    setCustomValue(digitsOnly)
                    setDraftPreset(null)
                    setCustomError('')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      saveCustomOption()
                    }
                  }}
                  placeholder="Masukkan angka"
                  className="min-w-0 flex-1 resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white px-3.5 py-2.5 text-sm font-bold text-[#252525] outline-none transition placeholder:font-normal placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                />

                <span className="rounded-xl border-[1.5px] border-[#252525] bg-[#eee8df] px-3 py-2.5 text-xs font-bold">
                  {selectedOption.unit}
                </span>
              </div>

              {customError && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">
                  {customError}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveOption(null)}
                  className="flex-1 rounded-xl border-[1.5px] border-[#252525] bg-white px-3 py-2.5 text-xs font-bold"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={saveCustomOption}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#252525] bg-[#BDECCF] px-3 py-2.5 text-xs font-bold shadow-[2px_2px_0px_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <Check size={15} />
                  Simpan
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* INFORMATION MODAL */}
      {activeInfo &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#252525]/40 px-5 py-6 backdrop-blur-sm"
            onClick={() => setActiveInfo(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0px_#252525]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#252525] bg-[#eee8df]">
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
                  className="rounded-lg p-1 hover:bg-[#eee8df]"
                >
                  <X size={19} />
                </button>
              </div>

              <p className="text-sm leading-relaxed text-[#6f675f]">
                {infoContent[activeInfo].description}
              </p>

              {activeInfo === 'feedback' && (
                <div className="mt-4">
                  <div className="mb-4 rounded-xl border border-[#252525]/20 bg-[#eee8df] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#888078]">
                      Dikirim ke
                    </p>
                    <p className="mt-1 break-all text-sm font-bold">
                      zetzayn@students.unnes.ac.id
                    </p>
                  </div>

                  <label className="mb-2 block text-xs font-bold">
                    Tulis masukanmu
                  </label>

                  <textarea
                    value={feedbackText}
                    onChange={(event) => setFeedbackText(event.target.value)}
                    rows={4}
                    maxLength={1500}
                    placeholder="Ceritakan saran, ide, atau kendala yang kamu temukan..."
                    className="w-full resize-none rounded-xl border-2 border-[#252525] bg-white p-3 text-sm text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
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
                  className="flex-1 rounded-xl border-[1.5px] border-[#252525] bg-white px-3 py-2.5 text-sm font-bold"
                >
                  Tutup
                </button>

                {activeInfo === 'feedback' && (
                  <button
                    type="button"
                    onClick={sendFeedback}
                    disabled={!feedbackText.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#252525] bg-[#FFE69A] px-3 py-2.5 text-sm font-bold shadow-[2px_2px_0_#252525] disabled:opacity-50"
                  >
                    <Mail size={16} />
                    Kirim
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* RESTORE CONFIRMATION */}
      {showRestoreConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#252525]/40 px-5 py-6 backdrop-blur-sm"
            onClick={() => {
              setShowRestoreConfirm(false)
              setPendingBackup(null)
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0px_#252525]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#252525] bg-[#BDECCF]">
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
                  className="flex-1 rounded-xl border-[1.5px] border-[#252525] bg-white px-3 py-2.5 text-sm font-bold"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={restoreBackup}
                  className="flex-1 rounded-xl border-2 border-[#252525] bg-[#BDECCF] px-3 py-2.5 text-sm font-bold shadow-[2px_2px_0px_#252525]"
                >
                  Pulihkan
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}