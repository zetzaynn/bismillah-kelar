import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  CheckCircle2,
  Circle,
  Pause,
  Play,
  Square,
  BookOpen,
  Dumbbell,
  Moon,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Heart,
  HandHeart,
  Footprints,
  Bike,
  Bed,
  GraduationCap,
  BookMarked,
  HeartPulse,
  Droplets,
  NotebookPen,
  Laptop,
  Sun,
  House,
  Wallet,
  Leaf,
  MoreHorizontal,
  Apple,
  AlarmClock,
  Brain,
  Brush,
  CookingPot,
  Languages,
  type LucideIcon,
} from 'lucide-react'

import { useAppData } from '../hooks/AppContext'
import type { Task, Habit } from '../types/app'

function getDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds,
  ).padStart(2, '0')}`
}

const habitIconMap: Record<string, LucideIcon> = {
  BookOpen,
  Dumbbell,
  Moon,
  Heart,
  HandHeart,
  Footprints,
  Bike,
  Bed,
  GraduationCap,
  BookMarked,
  HeartPulse,
  Droplets,
  NotebookPen,
  Laptop,
  Sun,
  House,
  Wallet,
  Leaf,
  Apple,
  AlarmClock,
  Brain,
  Brush,
  CookingPot,
  Languages,
}

const habitIconOptions: {
  name: string
  label: string
  icon: LucideIcon
}[] = [
  { name: 'BookOpen', label: 'Buku', icon: BookOpen },
  { name: 'BookMarked', label: 'Membaca', icon: BookMarked },
  { name: 'HandHeart', label: 'Ibadah', icon: HandHeart },
  { name: 'Heart', label: 'Hati', icon: Heart },
  { name: 'Dumbbell', label: 'Olahraga', icon: Dumbbell },
  { name: 'Footprints', label: 'Jalan', icon: Footprints },
  { name: 'Bike', label: 'Bersepeda', icon: Bike },
  { name: 'Moon', label: 'Tidur', icon: Moon },
  { name: 'Bed', label: 'Istirahat', icon: Bed },
  { name: 'GraduationCap', label: 'Belajar', icon: GraduationCap },
  { name: 'HeartPulse', label: 'Kesehatan', icon: HeartPulse },
  { name: 'Droplets', label: 'Hidrasi', icon: Droplets },
  { name: 'NotebookPen', label: 'Menulis', icon: NotebookPen },
  { name: 'Laptop', label: 'Produktif', icon: Laptop },
  { name: 'Sun', label: 'Pagi', icon: Sun },
  { name: 'House', label: 'Rumah', icon: House },
  { name: 'Wallet', label: 'Keuangan', icon: Wallet },
  { name: 'Leaf', label: 'Alam', icon: Leaf },
  { name: 'Apple', label: 'Makanan', icon: Apple },
  { name: 'AlarmClock', label: 'Disiplin', icon: AlarmClock },
  { name: 'Brain', label: 'Mental', icon: Brain },
  { name: 'Brush', label: 'Kebersihan', icon: Brush },
  { name: 'CookingPot', label: 'Memasak', icon: CookingPot },
  { name: 'Languages', label: 'Bahasa', icon: Languages },
]

function getHabitIconName(title: string) {
  const normalizedTitle = title.toLowerCase()

  if (
    normalizedTitle.includes('mengaji') ||
    normalizedTitle.includes('baca') ||
    normalizedTitle.includes('quran') ||
    normalizedTitle.includes('alquran') ||
    normalizedTitle.includes('tilawah')
  ) {
    return 'BookOpen'
  }

  if (
    normalizedTitle.includes('olahraga') ||
    normalizedTitle.includes('lari') ||
    normalizedTitle.includes('workout') ||
    normalizedTitle.includes('gym')
  ) {
    return 'Dumbbell'
  }

  if (
    normalizedTitle.includes('tidur') ||
    normalizedTitle.includes('istirahat')
  ) {
    return 'Moon'
  }

  return 'CheckCircle2'
}

export default function Today() {
  const {
    data,
    updateTask,
    updateDailyRecord,
    addHabit,
    updateHabit,
    deleteHabit,
    focusTimer,
    startFocusTimer,
    pauseFocusTimer,
    resetFocusTimer,
    hasActiveCompletionAlert,
    stopCompletionAlert,
  } = useAppData()

  const today = new Date()
  const todayString = getDateString(today)

  const profileName = data.profile.name.trim() || 'teman'

  const todayRecord = data.dailyRecords[todayString]
  const habitStatus = todayRecord?.habitStatus ?? {}
  const note = todayRecord?.note ?? ''
  const focusSessions = todayRecord?.focusSessions ?? 0
  const breakSessions = todayRecord?.breakSessions ?? 0

  const [saved, setSaved] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const [sessionMessage, setSessionMessage] = useState('')
  const previousMode = useRef(focusTimer.mode)

  const [habitModalOpen, setHabitModalOpen] = useState(false)
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null)
  const [deleteHabitTarget, setDeleteHabitTarget] = useState<Habit | null>(null)
  const [habitTitle, setHabitTitle] = useState('')
  const [habitDetail, setHabitDetail] = useState('')
  const [selectedHabitIcon, setSelectedHabitIcon] = useState('BookOpen')
  const [showAllHabitIcons, setShowAllHabitIcons] = useState(false)

  const [habitActionMode, setHabitActionMode] = useState<
    'normal' | 'edit' | 'delete'
  >('normal')

  const visibleHabitIcons = showAllHabitIcons
    ? habitIconOptions
    : habitIconOptions.slice(0, 9)

  const mode = focusTimer.mode
  const isRunning = focusTimer.status === 'running'

  const currentDuration = focusTimer.sessionMinutes * 60

  const earliestAllowedNow =
    focusTimer.endsAt !== null
      ? focusTimer.endsAt - focusTimer.remainingSeconds * 1000
      : now

  const effectiveNow = Math.max(now, earliestAllowedNow)

  const secondsLeft =
    isRunning && focusTimer.endsAt !== null
      ? Math.max(
          0,
          Math.ceil((focusTimer.endsAt - effectiveNow) / 1000),
        )
      : focusTimer.remainingSeconds

  useEffect(() => {
    if (!isRunning) return

    setNow(Date.now())

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 200)

    return () => window.clearInterval(interval)
  }, [isRunning, focusTimer.endsAt])

  useEffect(() => {
    if (previousMode.current !== mode) {
      setSessionMessage(
        mode === 'break'
          ? 'Sesi fokus selesai! Waktunya beristirahat.'
          : 'Istirahat selesai! Siap untuk fokus kembali?',
      )

      previousMode.current = mode
    }
  }, [mode])

  const habits = data.habits.map((habit) => ({
    ...habit,
    done: habitStatus[habit.id] ?? false,
  }))

  const tasks = data.tasks
    .filter((task) => task.date === todayString)
    .sort((a, b) => a.time.localeCompare(b.time))

  const completedTasks = tasks.filter(
    (task) => task.status === 'done',
  ).length

  const remainingTasks = tasks.length - completedTasks

  const completedHabits = habits.filter(
    (habit) => habit.done,
  ).length

  const weekday = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
  }).format(today)

  const fullDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today)

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    const mondayOffset = (today.getDay() + 6) % 7

    date.setDate(today.getDate() - mondayOffset + index)

    return {
      date,
      label: new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
      }).format(date),
      number: date.getDate(),
      active: date.toDateString() === today.toDateString(),
    }
  })

  function toggleTimer() {
    setSessionMessage('')
    setNow(Date.now())

    if (isRunning) {
      pauseFocusTimer()
    } else {
      startFocusTimer()
    }
  }

  function resetTimer() {
    setNow(Date.now())
    resetFocusTimer()
    setSessionMessage('')
  }

  function toggleTask(task: Task) {
    updateTask(task.id, {
      status: task.status === 'done' ? 'todo' : 'done',
    })
  }

  function toggleHabit(id: number) {
    updateDailyRecord(todayString, {
      habitStatus: {
        [id]: !(habitStatus[id] ?? false),
      },
    })
  }

  function openAddHabit() {
    setEditingHabitId(null)
    setHabitTitle('')
    setHabitDetail('')
    setSelectedHabitIcon('BookOpen')
    setShowAllHabitIcons(false)
    setHabitModalOpen(true)
  }

  function openEditHabit(habit: Habit) {
    setEditingHabitId(habit.id)
    setHabitTitle(habit.title)
    setHabitDetail(habit.detail)
    setSelectedHabitIcon(
      habit.icon || getHabitIconName(habit.title),
    )
    setShowAllHabitIcons(false)
    setHabitModalOpen(true)
    setHabitActionMode('normal')
  }

  function saveHabit() {
    const title = habitTitle.trim()
    const detail = habitDetail.trim()

    if (!title) return

    if (editingHabitId !== null) {
      updateHabit(editingHabitId, {
        title,
        detail: detail || 'Rutinitas harian',
        icon: selectedHabitIcon,
      })
    } else {
      addHabit({
        title,
        detail: detail || 'Rutinitas harian',
        icon: selectedHabitIcon,
      })
    }

    setHabitModalOpen(false)
    setEditingHabitId(null)
    setHabitTitle('')
    setHabitDetail('')
    setSelectedHabitIcon('BookOpen')
    setShowAllHabitIcons(false)
    setHabitActionMode('normal')
  }

  function handleHabitClick(habit: Habit) {
    if (habitActionMode === 'edit') {
      openEditHabit(habit)
      return
    }

    if (habitActionMode === 'delete') {
      setHabitActionMode('normal')
      setDeleteHabitTarget(habit)
      return
    }

    toggleHabit(habit.id)
  }

  function confirmDeleteHabit() {
    if (!deleteHabitTarget) return

    deleteHabit(deleteHabitTarget.id)
    setDeleteHabitTarget(null)
  }

  function handleNoteChange(value: string) {
    updateDailyRecord(todayString, {
      note: value,
    })

    setSaved(false)
  }

  function saveNote() {
    updateDailyRecord(todayString, {
      note,
    })
    setSaved(true)

    window.setTimeout(() => {
      setSaved(false)
    }, 2400)
  }

  const progress =
    currentDuration > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((currentDuration - secondsLeft) / currentDuration) * 100,
          ),
        )
      : 0

  return (
    <div className="space-y-6 pb-8 pr-[3px]">
      {/* Sapaan dan tanggal */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#252525] bg-[#252525] px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-[#FFE69A] shadow-[2px_2px_0_#D9CCFF]">
            {weekday}, {fullDate}
          </span>
        </div>

        <div>
          <h1 className="text-[25px] font-bold leading-tight tracking-tight">
            Bismillah, mari tuntaskan.
          </h1>

          <p className="mt-1 text-sm text-[#77716a]">
            Semoga harimu berkah &amp; terarah,{' '}
            <span className="font-bold text-[#252525]">
              {profileName}
            </span>.
          </p>
        </div>

        {/* Kalender mingguan */}
        <div className="flex justify-between gap-1.5 pt-2">
          {weekDays.map((day) => (
            <div
              key={day.date.toISOString()}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2.5 transition ${
                day.active
                  ? 'border-2 border-[#252525] bg-[#FFE69A] text-[#252525] shadow-[3px_3px_0_#252525]'
                  : 'border border-[#e5ddd0] bg-[#f5f0e7] text-[#6d665e]'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase ${
                  day.active ? 'text-[#252525]' : 'text-[#77716a]'
                }`}
              >
                {day.label.slice(0, 3)}
              </span>

              <span className="text-base font-extrabold">
                {day.number}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Ringkasan sesi timer hari ini */}
      <section className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border-[1.5px] border-[#252525] bg-[#FB923C] p-3 text-center shadow-[2px_2px_0_#252525]">
          <div className="flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full border border-[#252525] bg-white" />
            <span className="text-2xl font-extrabold text-[#252525]">
              {focusSessions}
            </span>
          </div>
          <span className="mt-1 inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold text-[#7c2d12]">
            Sesi Fokus
          </span>
        </div>

        <div className="rounded-xl border-[1.5px] border-[#252525] bg-[#4ADE80] p-3 text-center shadow-[2px_2px_0_#252525]">
          <div className="flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full border border-[#252525] bg-white" />
            <span className="text-2xl font-extrabold text-[#252525]">
              {breakSessions}
            </span>
          </div>
          <span className="mt-1 inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold text-[#14532d]">
            Sesi Istirahat
          </span>
        </div>
      </section>

      {/* Widget Pomodoro */}
      <section className="rounded-xl border-[1.5px] border-[#252525] bg-white p-4 shadow-[3px_3px_0_#252525]">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-full border border-[#252525] px-3 py-1 text-[11px] font-extrabold text-[#252525] ${
              mode === 'focus'
                ? 'bg-[#FB923C]'
                : 'bg-[#4ADE80]'
            }`}
          >
            ● {mode === 'focus' ? 'Mode Fokus' : 'Mode Istirahat'}
          </span>
        </div>

        <h2 className="mt-3.5 text-base font-bold">
          {mode === 'focus'
            ? `Waktunya fokus, ${profileName}.`
            : 'Waktunya beristirahat.'}
        </h2>

        <div className="mt-4 text-center">
          <p className="text-5xl font-extrabold tracking-tight tabular-nums">
            {formatTime(secondsLeft)}
          </p>

          <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[#77716a]">
            {isRunning
              ? 'Sedang berjalan'
              : focusTimer.status === 'paused'
                ? 'Timer dijeda'
                : 'Siap dimulai'}
          </p>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0ece4]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              mode === 'focus' ? 'bg-[#FB923C]' : 'bg-[#4ADE80]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 border-t border-[#eee8df] pt-4">
          <button
            type="button"
            onClick={resetTimer}
            aria-label="Reset timer"
            className="flex h-11 w-11 items-center justify-center rounded-lg border-[1.5px] border-[#252525] bg-white shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <RotateCcw size={16} />
          </button>

          <button
            type="button"
            onClick={toggleTimer}
            className="flex items-center gap-2 rounded-lg border-[1.5px] border-[#252525] bg-[#ffe69a] px-6 py-3 text-xs font-bold shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}

            {isRunning
              ? 'Jeda'
              : focusTimer.status === 'paused'
                ? 'Lanjutkan'
                : mode === 'focus'
                  ? 'Mulai Fokus'
                  : 'Mulai Istirahat'}
          </button>
        </div>

        {hasActiveCompletionAlert && (
          <button
            type="button"
            onClick={stopCompletionAlert}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#252525] bg-[#ffb5a7] px-4 py-3 text-xs font-bold shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <Square size={14} fill="currentColor" />
            Stop Suara &amp; Notifikasi
          </button>
        )}

        {sessionMessage && (
          <p className="mt-4 rounded-lg bg-[#f5f0e7] p-3 text-center text-xs font-semibold text-[#554507]">
            {sessionMessage}
          </p>
        )}

        <p className="mt-3 text-center text-[10px] text-[#999188]">
          Sesi fokus selesai akan tercatat otomatis.
        </p>
      </section>

      {/* Target harian */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Target Hari Ini</h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border-[1.5px] border-[#252525] bg-[#FB923C] p-2.5 text-center shadow-[2px_2px_0_#252525]">
            <div className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-[#252525] bg-white" />
              <span className="text-2xl font-extrabold text-[#252525]">
                {remainingTasks}
              </span>
            </div>
            <span className="mt-0.5 inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold text-[#7c2d12]">
              Tersisa
            </span>
          </div>

          <div className="rounded-xl border-[1.5px] border-[#252525] bg-[#4ADE80] p-2.5 text-center shadow-[2px_2px_0_#252525]">
            <div className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-[#252525] bg-white" />
              <span className="text-2xl font-extrabold text-[#252525]">
                {completedTasks}
              </span>
            </div>
            <span className="mt-0.5 inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold text-[#14532d]">
              Selesai
            </span>
          </div>
        </div>

        <div className="mt-6">
          {tasks.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-[#c7beb0] bg-white px-4 py-8 text-center">
              <p className="text-sm font-bold">
                Belum ada target hari ini
              </p>

              <p className="mt-1 text-xs text-[#77716a]">
                Tambahkan target melalui tombol Tambah Target untuk memulai harimu.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => {
                const isDone = task.status === 'done'

                return (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    data-sound="check"
                    aria-pressed={isDone}
                    aria-label={
                      isDone
                        ? `Batalkan selesai: ${task.title}`
                        : `Tandai selesai: ${task.title}`
                    }
                    onClick={() => toggleTask(task)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleTask(task)
                      }
                    }}
                    className={`flex cursor-pointer select-none items-start gap-3 rounded-xl border-2 border-[#252525] p-3.5 shadow-[3px_3px_0_#252525] transition-all duration-200 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                      isDone ? 'bg-[#CDE8D3]' : 'bg-white hover:bg-[#fffdf7]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#252525] transition ${
                        isDone
                          ? 'bg-[#252525] text-white'
                          : 'bg-white shadow-[1px_1px_0_#252525]'
                      }`}
                    >
                      {isDone && <Check size={14} strokeWidth={2.8} />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-bold leading-snug ${
                            isDone
                              ? 'text-[#252525]/75 line-through'
                              : 'text-[#252525]'
                          }`}
                        >
                          {task.title}
                        </p>

                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            isDone
                              ? 'bg-white/65 text-[#4a5d4e]'
                              : 'bg-[#f5f0e7] text-[#555049]'
                          }`}
                        >
                          {task.time} WIB
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border border-[#252525]/20 px-2 py-0.5 text-[10px] font-bold ${
                            isDone ? 'bg-white/65 text-[#4a5d4e]' : 'bg-[#f0ece4]'
                          }`}
                        >
                          {task.category}
                        </span>

                        {!isDone && (
                          <span
                            className={`rounded-md border border-[#252525]/20 px-2 py-0.5 text-[10px] font-extrabold ${
                              task.priority === 'Tinggi'
                                ? 'bg-[#ffb5a7] text-[#5f160c]'
                                : task.priority === 'Sedang'
                                  ? 'bg-[#ffe69a] text-[#4f3d06]'
                                  : 'bg-[#ece8e0] text-[#4a4640]'
                            }`}
                          >
                            {task.priority}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold ${
                            isDone ? 'text-[#4a5d4e]' : 'text-[#77716a]'
                          }`}
                        >
                          {isDone ? '✓ Selesai' : 'Belum selesai'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Rutinitas harian: ikon hapus menggunakan merah muda lembut (#ffb5a7) */}
      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Rutinitas Harian</h2>

            <span className="mt-1 block text-[10px] font-semibold text-[#77716a]">
              {completedHabits} dari {habits.length} lengkap
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openAddHabit}
              aria-label="Tambah rutinitas"
              title="Tambah rutinitas"
              className="flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-[#252525] bg-[#D9CCFF] text-[#252525] shadow-[2px_2px_0_#252525] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Plus size={19} />
            </button>

            <button
              type="button"
              onClick={() =>
                setHabitActionMode((current) =>
                  current === 'edit' ? 'normal' : 'edit',
                )
              }
              aria-label="Edit rutinitas"
              aria-pressed={habitActionMode === 'edit'}
              title="Edit rutinitas"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-[#252525] text-[#252525] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                habitActionMode === 'edit'
                  ? 'translate-x-[2px] translate-y-[2px] bg-[#f7d874] shadow-none'
                  : 'bg-[#ffe69a] shadow-[2px_2px_0_#252525]'
              }`}
            >
              <Pencil size={17} />
            </button>

            <button
              type="button"
              onClick={() =>
                setHabitActionMode((current) =>
                  current === 'delete' ? 'normal' : 'delete',
                )
              }
              aria-label="Hapus rutinitas"
              aria-pressed={habitActionMode === 'delete'}
              title="Hapus rutinitas"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-[#252525] text-[#252525] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                habitActionMode === 'delete'
                  ? 'translate-x-[2px] translate-y-[2px] bg-[#ff9e8d] shadow-none'
                  : 'bg-[#ffb5a7] shadow-[2px_2px_0_#252525]'
              }`}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>

        {habitActionMode !== 'normal' && (
          <p className="mb-3 rounded-lg bg-[#f5f0e7] px-3 py-2 text-[11px] font-medium text-[#77716a]">
            {habitActionMode === 'edit'
              ? 'Pilih rutinitas yang ingin diedit.'
              : 'Pilih rutinitas yang ingin dihapus.'}
            <button
              type="button"
              onClick={() => setHabitActionMode('normal')}
              className="ml-2 font-bold text-[#252525] underline"
            >
              Batal
            </button>
          </p>
        )}

        {habits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d8d0c4] px-4 py-8 text-center">
            <p className="text-sm font-bold">
              Belum ada rutinitas
            </p>
            <p className="mt-1 text-xs text-[#77716a]">
              Tekan tombol plus untuk menambahkan rutinitas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {habits.map((habit) => {
              const iconName =
                habit.icon || getHabitIconName(habit.title)

              const HabitIcon =
                habitIconMap[iconName] || CheckCircle2

              return (
                <button
                  key={habit.id}
                  type="button"
                  data-sound={habitActionMode === 'normal' ? 'check' : 'click'}
                  onClick={() => handleHabitClick(habit)}
                  aria-label={
                    habitActionMode === 'edit'
                      ? `Edit ${habit.title}`
                      : habitActionMode === 'delete'
                        ? `Hapus ${habit.title}`
                        : habit.done
                          ? `Batalkan ${habit.title}`
                          : `Tandai ${habit.title} selesai`
                  }
                  className={`flex min-w-0 flex-col justify-between rounded-xl border-[1.5px] p-2.5 text-left transition-all duration-300 ease-out active:translate-x-0.5 active:translate-y-0.5 ${
                    habitActionMode === 'edit'
                      ? 'border-[#252525] bg-[#fff3c4] shadow-[2px_2px_0_#252525]'
                      : habitActionMode === 'delete'
                        ? 'border-[#252525] bg-[#ffe0d9] shadow-[2px_2px_0_#252525]'
                        : habit.done
                          ? 'border-[#252525] bg-[#CDE8D3] shadow-[2px_2px_0_#252525]'
                          : 'border-[#252525] bg-white shadow-[2px_2px_0_#252525]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f5f0e7]">
                      <HabitIcon
                        size={14}
                        strokeWidth={2.2}
                      />
                    </span>

                    {habitActionMode === 'edit' ? (
                      <Pencil size={14} />
                    ) : habitActionMode === 'delete' ? (
                      <Trash2 size={14} />
                    ) : habit.done ? (
                      <CheckCircle2
                        size={15}
                        strokeWidth={2.3}
                      />
                    ) : (
                      <Circle size={15} />
                    )}
                  </div>

                  <div className="mt-2">
                    <span className="block break-words text-[11px] font-extrabold leading-tight text-[#252525]">
                      {habit.title}
                    </span>

                    <span className="mt-1 block break-words text-[10px] leading-snug text-[#5f625c]">
                      {habit.done ? 'Selesai hari ini ✓' : habit.detail}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal tambah dan edit rutinitas */}
      {habitModalOpen &&
        createPortal(
          <div
            onClick={() => setHabitModalOpen(false)}
            className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#252525]/40 px-5 py-6 backdrop-blur-sm"
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              className="my-auto max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-bold">
                  {editingHabitId !== null
                    ? 'Edit Rutinitas'
                    : 'Tambah Rutinitas'}
                </h3>

                <button
                  type="button"
                  onClick={() => setHabitModalOpen(false)}
                  aria-label="Tutup"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0ece4] hover:bg-[#e5dfd3]"
                >
                  <X size={17} />
                </button>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  saveHabit()
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-xs font-bold">
                    Pilih ikon rutinitas
                  </label>

                  <div className="grid grid-cols-5 gap-1.5">
                    {visibleHabitIcons.map((option) => {
                      const OptionIcon = option.icon
                      const isSelected =
                        selectedHabitIcon === option.name

                      return (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() =>
                            setSelectedHabitIcon(option.name)
                          }
                          title={option.label}
                          aria-label={`Pilih ikon ${option.label}`}
                          aria-pressed={isSelected}
                          className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] px-1 py-1.5 transition ${
                            isSelected
                              ? 'border-[#252525] bg-[#D9CCFF] shadow-[2px_2px_0_#252525]'
                              : 'border-[#e3dbcf] bg-white hover:border-[#252525]'
                          }`}
                        >
                          <OptionIcon size={15} />
                          <span className="text-center text-[8px] font-bold leading-tight">
                            {option.label}
                          </span>
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      onClick={() =>
                        setShowAllHabitIcons((current) => !current)
                      }
                      aria-expanded={showAllHabitIcons}
                      aria-label={
                        showAllHabitIcons
                          ? 'Tutup ikon tambahan'
                          : 'Lihat ikon lainnya'
                      }
                      title={
                        showAllHabitIcons
                          ? 'Tutup ikon tambahan'
                          : 'Ikon lainnya'
                      }
                      className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-[#252525] px-1 py-1.5 transition ${
                        showAllHabitIcons
                          ? 'bg-[#FFE08A] shadow-[2px_2px_0_#252525]'
                          : 'bg-white hover:bg-[#FFE08A]'
                      }`}
                    >
                      <MoreHorizontal size={16} strokeWidth={2.5} />

                      <span className="text-center text-[8px] font-bold leading-tight">
                        {showAllHabitIcons ? 'Tutup' : 'Lainnya'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold">
                    Nama rutinitas
                  </label>
                  <textarea
                    autoFocus
                    rows={1}
                    enterKeyHint="next"
                    value={habitTitle}
                    onChange={(event) =>
                      setHabitTitle(event.target.value.replace(/\r?\n/g, ''))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                      }
                    }}
                    placeholder="Contoh: Membaca buku"
                    maxLength={40}
                    required
                    className="w-full resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white px-3 py-3 text-sm text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold">
                    Keterangan
                  </label>
                  <textarea
                    rows={1}
                    enterKeyHint="done"
                    value={habitDetail}
                    onChange={(event) =>
                      setHabitDetail(event.target.value.replace(/\r?\n/g, ''))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                    placeholder="Contoh: 15 menit setiap hari"
                    maxLength={70}
                    className="w-full resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white px-3 py-3 text-sm text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                  />
                </div>

                <button
                  type="submit"
                  data-sound="success"
                  className="flex w-full items-center justify-center rounded-xl border-2 border-[#252525] bg-[#D9CCFF] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  {editingHabitId !== null
                    ? 'Simpan Perubahan'
                    : 'Tambah Rutinitas'}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal konfirmasi hapus rutinitas */}
      {deleteHabitTarget &&
        createPortal(
          <div
            onClick={() => setDeleteHabitTarget(null)}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-[#252525]/40 px-4 py-6 backdrop-blur-sm"
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#252525] bg-[#FFB5A7]/40 text-[#252525]">
                <AlertTriangle size={23} />
              </div>

              <h2 className="mt-4 text-center text-base font-bold">
                Hapus rutinitas ini?
              </h2>

              <p className="mt-2 text-center text-xs leading-relaxed text-[#77716a]">
                Rutinitas{' '}
                <strong className="text-[#252525]">
                  {deleteHabitTarget.title}
                </strong>{' '}
                akan dihapus dari daftar rutinitas harianmu.
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteHabitTarget(null)}
                  className="flex-1 rounded-xl border-[1.5px] border-[#252525] bg-white px-4 py-3 text-xs font-bold"
                >
                  Batal
                </button>

                <button
                  type="button"
                  data-sound="success"
                  onClick={confirmDeleteHabit}
                  className="flex-1 rounded-xl border-2 border-[#252525] bg-[#FFB5A7] px-4 py-3 text-xs font-extrabold text-[#252525] shadow-[2px_2px_0_#252525]"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Catatan kilat */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Catatan Kilat</h2>
        </div>

        <div className="rounded-xl border-2 border-[#252525] bg-white p-3.5 shadow-[3px_3px_0_#252525]">
          <textarea
            value={note}
            onChange={(event) => handleNoteChange(event.target.value)}
            placeholder="Tuliskan gagasan, renungan, atau catatan penting hari ini..."
            rows={3}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#aaa197]"
          />

          <div className="flex items-center justify-between gap-2 border-t-[1.5px] border-[#e5ddd0] pt-3">
            {saved ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#252525] bg-[#CDE8D3] px-2.5 py-1 text-[11px] font-bold text-[#234d2c]">
                <Check size={12} strokeWidth={2.6} />
                Catatan tersimpan
              </span>
            ) : (
              <span className="text-[10px] font-medium text-[#8a8278]">
                Tersimpan otomatis di perangkat
              </span>
            )}

            <button
              type="button"
              data-sound="success"
              onClick={saveNote}
              className="rounded-lg border-[1.5px] border-[#252525] bg-[#ffe69a] px-4 py-2 text-xs font-bold text-[#252525] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Simpan
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}