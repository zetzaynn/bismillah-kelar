
import { useEffect, useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Circle,
  Pause,
  Play,
  Square,
  BookOpen,
  Droplets,
  NotebookPen,
  Lock,
  RotateCcw,
} from 'lucide-react'

import { useAppData } from '../hooks/AppContext'
import type { Task } from '../types/app'

function getDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// Mengubah detik menjadi format MM:SS
function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds,
  ).padStart(2, '0')}`
}

export default function Today() {
  const {
    data,
    updateTask,
    updateDailyRecord,
    focusTimer,
    startFocusTimer,
    pauseFocusTimer,
    resetFocusTimer,
    hasActiveCompletionAlert,
    stopCompletionAlert,
  } = useAppData()

  const today = new Date()
  const todayString = getDateString(today)

  const todayRecord = data.dailyRecords[todayString]
  const habitStatus = todayRecord?.habitStatus ?? {}
  const note = todayRecord?.note ?? ''
  const focusSessions = todayRecord?.focusSessions ?? 0

  // State catatan
  const [saved, setSaved] = useState(false)

  // State untuk memperbarui tampilan countdown.
  // Timer sebenarnya tetap berjalan di AppContext.
  const [now, setNow] = useState(() => Date.now())

  // Pesan ketika mode timer berganti
  const [sessionMessage, setSessionMessage] = useState('')
  const previousMode = useRef(focusTimer.mode)

  // Mengambil data timer global
  const mode = focusTimer.mode
  const isRunning = focusTimer.status === 'running'

  const currentDuration = focusTimer.sessionMinutes * 60

  const secondsLeft =
    isRunning && focusTimer.endsAt !== null
      ? Math.max(
          0,
          Math.ceil((focusTimer.endsAt - now) / 1000),
        )
      : focusTimer.remainingSeconds

  // Memperbarui tampilan countdown setiap 250 milidetik
  useEffect(() => {
    if (!isRunning) return

    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 250)

    return () => window.clearInterval(interval)
  }, [isRunning, focusTimer.endsAt])

  // Memperbarui pesan ketika mode fokus/istirahat berganti
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

  // Mengambil rutinitas dari AppContext
  const habits = data.habits.map((habit) => ({
    ...habit,
    done: habitStatus[habit.id] ?? false,
  }))

  // Mengambil tugas berdasarkan tanggal hari ini
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

  // Format tanggal
  const weekday = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
  }).format(today)

  const fullDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today)

  // Kalender mingguan
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

  // Mengontrol timer global
  function toggleTimer() {
    setSessionMessage('')

    if (isRunning) {
      pauseFocusTimer()
    } else {
      startFocusTimer()
    }
  }

  // Reset timer global
  function resetTimer() {
    resetFocusTimer()
    setSessionMessage('')
  }

  // Mengubah status tugas melalui AppContext
  function toggleTask(task: Task) {
    updateTask(task.id, {
      status: task.status === 'done' ? 'todo' : 'done',
    })
  }

  // Mengubah status rutinitas dan menyimpannya berdasarkan tanggal
  function toggleHabit(id: number) {
    updateDailyRecord(todayString, {
      habitStatus: {
        [id]: !(habitStatus[id] ?? false),
      },
    })
  }

  // Menyimpan catatan otomatis melalui AppContext
  function handleNoteChange(value: string) {
    updateDailyRecord(todayString, {
      note: value,
    })

    setSaved(false)
  }

  // Indikator penyimpanan catatan
  function saveNote() {
    setSaved(true)

    window.setTimeout(() => {
      setSaved(false)
    }, 1800)
  }

  const habitIcons = [BookOpen, Droplets, NotebookPen]

  const progress = Math.min(
    100,
    Math.max(
      0,
      ((currentDuration - secondsLeft) / currentDuration) * 100,
    ),
  )

  return (
    <div className="space-y-7 pb-8">

      {/* Sapaan dan tanggal */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#77716a]">
            {weekday}, {fullDate}
          </span>

          <span className="rounded-full bg-[#ffe69a] px-3 py-1 text-[10px] font-bold text-[#554507]">
            ● Alur Tenang
          </span>
        </div>

        <div>
          <h1 className="text-[25px] font-bold leading-tight tracking-tight">
            Bismillah, mari tuntaskan.
          </h1>

          <p className="mt-1 text-sm text-[#77716a]">
            Semoga harimu berkah &amp; terarah,{' '}
            <span className="font-bold text-[#252525]">Zayy</span>.
          </p>
        </div>

        {/* Kalender mingguan */}
        <div className="flex justify-between gap-1 pt-2">
          {weekDays.map((day) => (
            <div
              key={day.date.toISOString()}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 ${
                day.active
                  ? 'border border-[#252525] bg-[#ffe69a] shadow-[2px_2px_0_#252525]'
                  : 'bg-[#f5f0e7]'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase text-[#77716a]">
                {day.label.slice(0, 3)}
              </span>

              <span className="text-base font-bold">
                {day.number}
              </span>

              {day.active && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#252525]" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Ringkasan aktivitas */}
      <section className="grid grid-cols-3 gap-2">
        {[
          {
            value: completedTasks,
            label: 'Selesai',
            color: '#d9ccff',
          },
          {
            value: remainingTasks,
            label: 'Tersisa',
            color: '#ffb5a7',
          },
          {
            value: focusSessions,
            label: 'Sesi Fokus',
            color: '#ffe69a',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-[#f5f0e7] p-3 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />

              <span className="text-2xl font-extrabold">
                {item.value}
              </span>
            </div>

            <span className="text-[10px] font-semibold text-[#77716a]">
              {item.label}
            </span>
          </div>
        ))}
      </section>

      {/* Widget Pomodoro */}
      <section className="rounded-xl border-[1.5px] border-[#252525] bg-white p-4 shadow-[3px_3px_0_#252525]">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold ${
              mode === 'focus'
                ? 'bg-[#d9ccff]'
                : 'bg-[#d7eee0]'
            }`}
          >
            ● {mode === 'focus' ? 'Mode Fokus' : 'Mode Istirahat'}
          </span>

          <span className="text-[10px] font-semibold text-[#77716a]">
            {Math.round(currentDuration / 60)} menit
          </span>
        </div>

        <h2 className="mt-4 text-base font-bold">
          {mode === 'focus'
            ? 'Waktunya fokus, Zayy.'
            : 'Waktunya beristirahat.'}
        </h2>

        <p className="mt-1 text-xs text-[#77716a]">
          {mode === 'focus'
            ? 'Selesaikan satu hal penting dalam satu waktu.'
            : 'Ambil jeda sejenak sebelum kembali beraktivitas.'}
        </p>

        {/* Tampilan waktu */}
        <div className="mt-5 text-center">
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

        {/* Progress bar */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0ece4]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              mode === 'focus' ? 'bg-[#c7b5ff]' : 'bg-[#9bc9aa]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Tombol kontrol */}
        <div className="mt-5 flex items-center justify-center gap-3 border-t border-[#eee8df] pt-4">
          <button
            onClick={resetTimer}
            aria-label="Reset timer"
            className="flex h-11 w-11 items-center justify-center rounded-lg border-[1.5px] border-[#252525] bg-white shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <RotateCcw size={16} />
          </button>

          <button
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

        {/* Tombol menghentikan suara dan notifikasi */}
        {hasActiveCompletionAlert && (
          <button
            onClick={stopCompletionAlert}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#252525] bg-[#ffb5a7] px-4 py-3 text-xs font-bold shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <Square size={14} fill="currentColor" />
            Stop Suara &amp; Notifikasi
          </button>
        )}

        {/* Pesan setelah sesi selesai */}
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
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">Target Hari Ini</h2>

            <span className="rounded-full bg-[#d9ccff] px-2 py-1 text-[10px] font-bold">
              {remainingTasks} tersisa
            </span>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d8d0c4] px-4 py-8 text-center">
            <p className="text-sm font-bold">
              Belum ada target hari ini
            </p>

            <p className="mt-1 text-xs text-[#77716a]">
              Tambahkan tugas melalui menu Tugas untuk memulai harimu.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e9e1d5]">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 py-4 ${
                  task.status === 'done' ? 'opacity-55' : ''
                }`}
              >
                <button
                  onClick={() => toggleTask(task)}
                  aria-label={
                    task.status === 'done'
                      ? 'Batalkan tugas selesai'
                      : 'Tandai tugas selesai'
                  }
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#252525] ${
                    task.status === 'done'
                      ? 'bg-[#d9ccff]'
                      : 'bg-white shadow-[1px_1px_0_#252525]'
                  }`}
                >
                  {task.status === 'done' && <Check size={14} />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        task.status === 'done' ? 'line-through' : ''
                      }`}
                    >
                      {task.title}
                    </p>

                    <span className="shrink-0 text-[10px] text-[#77716a]">
                      {task.time} WIB
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#f0ece4] px-2 py-1 text-[10px] font-semibold">
                      {task.category}
                    </span>

                    {task.status === 'todo' && (
                      <span
                        className={`rounded px-2 py-1 text-[10px] font-bold ${
                          task.priority === 'Tinggi'
                            ? 'bg-[#ffb5a7]'
                            : task.priority === 'Sedang'
                              ? 'bg-[#ffe69a]'
                              : 'bg-[#ece8e0]'
                        }`}
                      >
                        {task.priority}
                      </span>
                    )}

                    <span className="text-[10px] text-[#77716a]">
                      {task.status === 'done' ? 'Tuntas' : 'Belum selesai'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rutinitas harian */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Rutinitas Harian</h2>

          <span className="text-[10px] font-semibold text-[#77716a]">
            {completedHabits} dari {habits.length} lengkap
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {habits.map((habit, index) => {
            const HabitIcon = habitIcons[index]

            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`flex min-w-0 flex-col rounded-xl border p-3 text-left transition ${
                  habit.done
                    ? 'border-[#e9e1d5] bg-[#f5f0e7]'
                    : 'border-[#252525] bg-white shadow-[2px_2px_0_#252525]'
                }`}
              >
                <div className="flex items-center justify-between">
                  {HabitIcon && <HabitIcon size={18} />}

                  {habit.done ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Circle size={15} />
                  )}
                </div>

                <span className="mt-3 truncate text-xs font-bold">
                  {habit.title}
                </span>

                <span className="mt-1 text-[9px] text-[#77716a]">
                  {habit.done ? 'Selesai' : habit.detail}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Catatan kilat */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Catatan Kilat</h2>

          <span className="flex items-center gap-1 text-[10px] text-[#77716a]">
            <Lock size={12} /> Lokal
          </span>
        </div>

        <div className="rounded-xl border border-[#e9e1d5] bg-white p-3">
          <textarea
            value={note}
            onChange={(event) => handleNoteChange(event.target.value)}
            placeholder="Tuliskan gagasan, renungan, atau catatan penting hari ini..."
            rows={3}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#aaa197]"
          />

          <div className="flex items-center justify-between border-t border-[#eee8df] pt-3">
            <span className="text-[10px] text-[#999188]">
              {saved ? 'Catatan tersimpan ✓' : 'Tersimpan otomatis'}
            </span>

            <button
              onClick={saveNote}
              className="rounded-lg bg-[#ffe69a] px-3 py-2 text-[10px] font-bold"
            >
              Simpan
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
