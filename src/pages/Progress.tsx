
import { useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flame,
  BookOpen,
  Brain,
  Pencil,
  Check,
  X,
} from 'lucide-react'

import { useAppData } from '../hooks/AppContext'

type Period = 'Pekan Ini' | 'Bulan Ini'

const weekLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const habitColors = ['#BDECCF', '#D9CCFF', '#FFE69A', '#FFB5A7', '#BBDFFF']

const emptyReflection = {
  good: '',
  improve: '',
  next: '',
}

const milestones = [
  {
    title: 'Konsistensi 14 Hari',
    description: 'Membangun kebiasaan menyelesaikan target harian.',
    icon: Flame,
    color: '#FFE69A',
  },
  {
    title: 'Pembelajar Konsisten',
    description: 'Meluangkan waktu untuk membaca dan belajar.',
    icon: BookOpen,
    color: '#BDECCF',
  },
  {
    title: 'Fokus Mendalam',
    description: 'Menyelesaikan sesi fokus tanpa gangguan.',
    icon: Brain,
    color: '#D9CCFF',
  },
]

const pad = (value: number) => String(value).padStart(2, '0')

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getMonday(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export default function Progress() {
  const { data, updateDailyRecord } = useAppData()
  const profileName = data.profile.name.trim() || 'teman'

  const [period, setPeriod] = useState<Period>('Pekan Ini')
  const [showPeriod, setShowPeriod] = useState(false)

 const weekStartKey = getDateKey(getMonday(new Date()))

const reflection =
  data.dailyRecords[weekStartKey]?.reflection ?? emptyReflection

const [editingReflection, setEditingReflection] = useState(false)

const [draftReflection, setDraftReflection] = useState({
  ...emptyReflection,
})

  const now = new Date()
  const todayKey = getDateKey(now)

  const monday = getMonday(now)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const periodStart = period === 'Pekan Ini' ? monday : monthStart
  const periodEnd = period === 'Pekan Ini' ? sunday : monthEnd

  const periodStartKey = getDateKey(periodStart)
  const periodEndKey = getDateKey(periodEnd)

  // Data tugas dan agenda
  const allTasks = data.tasks

  const allAgenda = Object.entries(data.agenda).flatMap(
    ([date, items]) =>
      items.map((item) => ({
        ...item,
        date,
      })),
  )

  const periodTasks = allTasks.filter(
    (task) =>
      task.date >= periodStartKey &&
      task.date <= periodEndKey,
  )

  const periodAgenda = allAgenda.filter(
    (item) =>
      item.date >= periodStartKey &&
      item.date <= periodEndKey,
  )

  const completedTasks = periodTasks.filter(
    (task) => task.status === 'done',
  )

  const completedAgenda = periodAgenda.filter(
    (item) => item.done,
  )

  const totalCompleted = completedTasks.length + completedAgenda.length

  const productiveDates = new Set([
    ...completedTasks.map((task) => task.date),
    ...completedAgenda.map((item) => item.date),
  ])

  const productiveDays = productiveDates.size

  // Data sesi fokus dari DailyRecord
  const periodRecords = Object.entries(data.dailyRecords).filter(
    ([date]) =>
      date >= periodStartKey &&
      date <= periodEndKey,
  )

  const totalFocusSessions = periodRecords.reduce(
    (sum, [, record]) => sum + (record.focusSessions ?? 0),
    0,
  )

  const totalFocusMinutes = periodRecords.reduce(
    (sum, [, record]) => sum + (record.focusMinutes ?? 0),
    0,
  )

  const averageFocusMinutes =
    totalFocusSessions > 0
      ? Math.round(totalFocusMinutes / totalFocusSessions)
      : 0

  const weekRange = `${formatDate(monday)} – ${formatDate(sunday)} ${sunday.getFullYear()}`

  const monthlyLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(now)

  // Menghitung persentase kebiasaan berdasarkan hari yang sudah berjalan
  const elapsedDays =
    period === 'Pekan Ini'
      ? Math.min(
          7,
          Math.max(
            0,
            Math.floor(
              (new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
              ).getTime() - monday.getTime()) / 86400000,
            ) + 1,
          ),
        )
      : now.getDate()

  const habitCount = data.habits.length

  const completedHabitPoints = Array.from(
    { length: elapsedDays },
    (_, index) => {
      const date = new Date(periodStart)
      date.setDate(periodStart.getDate() + index)

      const record = data.dailyRecords[getDateKey(date)]

      return data.habits.filter(
        (habit) => record?.habitStatus?.[habit.id] === true,
      ).length
    },
  ).reduce((sum, value) => sum + value, 0)

  const totalHabitPoints = habitCount * elapsedDays

  const habitPercentage =
    totalHabitPoints > 0
      ? Math.round(
          (completedHabitPoints / totalHabitPoints) * 100,
        )
      : 0

  // Data grafik aktivitas produktif
  const chartData = useMemo(() => {
    if (period === 'Pekan Ini') {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + index)

        const key = getDateKey(date)

        const tasksDone = completedTasks.filter(
          (task) => task.date === key,
        ).length

        const agendaDone = completedAgenda.filter(
          (item) => item.date === key,
        ).length

        return {
          label: weekLabels[index],
          value: tasksDone + agendaDone,
        }
      })
    }

    return Array.from({ length: 5 }, (_, index) => {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        index * 7 + 1,
      )

      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        Math.min((index + 1) * 7, monthEnd.getDate()),
      )

      const startKey = getDateKey(start)
      const endKey = getDateKey(end)

      const tasksDone = completedTasks.filter(
        (task) =>
          task.date >= startKey &&
          task.date <= endKey,
      ).length

      const agendaDone = completedAgenda.filter(
        (item) =>
          item.date >= startKey &&
          item.date <= endKey,
      ).length

      return {
        label: `Pekan ${index + 1}`,
        value: tasksDone + agendaDone,
      }
    })
  }, [
    period,
    completedTasks,
    completedAgenda,
    monday,
    now,
    monthEnd,
  ])

  const maxChartValue = Math.max(
    1,
    ...chartData.map((item) => item.value),
  )

  const averageActivities = (
    totalCompleted /
    Math.max(1, elapsedDays)
  ).toFixed(1)

  // Data kebiasaan mingguan yang tersinkronisasi dengan Today
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)

    return {
      date,
      key: getDateKey(date),
    }
  })

  function toggleHabit(habitId: number, dateKey: string) {
    const currentRecord = data.dailyRecords[dateKey]
    const currentStatus =
      currentRecord?.habitStatus?.[habitId] ?? false

    updateDailyRecord(dateKey, {
      habitStatus: {
        [habitId]: !currentStatus,
      },
    })
  }

function saveReflection() {
  updateDailyRecord(weekStartKey, {
    reflection: { ...draftReflection },
  })

  setEditingReflection(false)
}

  const milestoneStatus = [
    productiveDays >= 14 ? 'Tercapai' : 'Dalam Proses',
    completedTasks.length >= 5 ? 'Tercapai' : 'Dalam Proses',
    totalFocusSessions >= 5 ? 'Tercapai' : 'Dalam Proses',
  ]

  return (
    <div className="space-y-7 pb-24">

      {/* Header */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Progres
            </h1>
            <p className="mt-1 text-xs text-[#77716a]">
              Lihat perkembangan kecil yang berarti, {profileName}.
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowPeriod(!showPeriod)}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[10px] font-bold shadow-[2px_2px_0_#252525]"
            >
              <CalendarDays size={14} />
              {period}
              <ChevronDown size={13} />
            </button>

            {showPeriod && (
              <div className="absolute right-0 top-11 z-30 w-36 rounded-xl border border-[#e9e1d5] bg-white p-2 shadow-lg">
                {(['Pekan Ini', 'Bulan Ini'] as Period[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setPeriod(item)
                      setShowPeriod(false)
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                      period === item
                        ? 'bg-[#ffe69a] font-bold'
                        : 'hover:bg-[#f5f0e7]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#f1ede6] px-3 py-1 text-[10px] font-semibold text-[#77716a]">
            ● {period === 'Pekan Ini' ? weekRange : monthlyLabel}
          </span>
          <span className="text-[10px] text-[#77716a]">
            • Ruang Produktivitas Personal
          </span>
        </div>
      </section>

      {/* Overview */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-y-5">
          {[
            {
              label: 'Tingkat Kebiasaan',
              value: `${habitPercentage}%`,
              color: '#BDECCF',
            },
            {
              label: 'Tugas Beres',
              value: completedTasks.length,
              color: '#D9CCFF',
            },
            {
              label: 'Aktivitas Selesai',
              value: totalCompleted,
              color: '#FFB5A7',
            },
            {
              label: 'Hari Produktif',
              value: `${productiveDays} hari`,
              color: '#FFE69A',
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-lg font-extrabold">{item.value}</p>
                <p className="text-[10px] text-[#77716a]">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activity chart */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">
              Aktivitas Produktif
            </h2>
            <p className="mt-1 text-[10px] text-[#77716a]">
              Rata-rata {averageActivities} aktivitas selesai per hari
            </p>
          </div>

          <span className="rounded-full bg-[#d9ccff] px-2 py-1 text-[9px] font-bold">
            {totalCompleted} selesai
          </span>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex justify-between text-[9px] text-[#999188]">
            <span>{maxChartValue} aktivitas</span>
            <span>0 aktivitas</span>
          </div>

          <div className="flex h-44 items-end justify-between gap-2 border-b border-[#e9e1d5] pb-2">
            {chartData.map((item) => {
              const height = (item.value / maxChartValue) * 100

              return (
                <div
                  key={item.label}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[9px] font-semibold text-[#77716a]">
                    {item.value}
                  </span>

                  <div
                    className={`w-full max-w-7 rounded-t-md transition-all ${
                      item.value > 0
                        ? 'bg-[#bdeccf] shadow-[2px_2px_0_#252525]'
                        : 'bg-[#e8e3da]'
                    }`}
                    style={{
                      height: `${Math.max(height, 3)}%`,
                    }}
                  />

                  <span className="text-[9px] font-semibold text-[#77716a]">
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="mt-3 text-center text-[9px] text-[#999188]">
            Berdasarkan tugas dan agenda yang ditandai selesai.
          </p>
        </div>
      </section>

      {/* Focus statistics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">
            Statistik Sesi Fokus
          </h2>
          <span className="rounded-lg bg-[#ffe69a] px-2 py-1 text-[9px] font-bold shadow-[1px_1px_0_#252525]">
            Mode Fokus
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d9ccff]">
              <Brain size={18} />
            </div>
            <p className="mt-3 text-2xl font-extrabold">
              {totalFocusSessions}
            </p>
            <p className="text-[10px] text-[#77716a]">
              Sesi fokus selesai
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#bdeccf]">
              <Clock3 size={18} />
            </div>
            <p className="mt-3 text-2xl font-extrabold">
              {totalFocusMinutes}
              <span className="ml-1 text-xs font-semibold">menit</span>
            </p>
            <p className="text-[10px] text-[#77716a]">
              Total waktu fokus
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold">
                Rata-rata durasi sesi
              </p>
              <p className="mt-1 text-[10px] text-[#77716a]">
                Berdasarkan sesi fokus yang selesai
              </p>
            </div>
            <span className="text-lg font-extrabold">
              {averageFocusMinutes} menit
            </span>
          </div>
        </div>
      </section>

      {/* Habit tracker */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold">
            Kebiasaan Sepekan
          </h2>
          <p className="mt-1 text-[10px] text-[#77716a]">
            Terhubung langsung dengan Rutinitas Harian di Today.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold">
              {completedHabitPoints}/{totalHabitPoints} aktivitas
            </span>
            <span className="text-xs font-bold text-[#625884]">
              {habitPercentage}%
            </span>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#f1ede6]">
            <div
              className="h-full rounded-full bg-[#bdeccf] transition-all"
              style={{ width: `${habitPercentage}%` }}
            />
          </div>

          {data.habits.length === 0 ? (
            <p className="py-5 text-center text-xs text-[#77716a]">
              Belum ada rutinitas yang tersedia.
            </p>
          ) : (
            <div className="space-y-4">
              {data.habits.map((habit, habitIndex) => {
                const completed = weekDays.filter(
                  (day) =>
                    data.dailyRecords[day.key]?.habitStatus?.[habit.id] === true,
                ).length

                return (
                  <div key={habit.id}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">
                        {habit.title}
                      </span>
                      <span className="text-[9px] text-[#77716a]">
                        {completed}/7 hari
                      </span>
                    </div>

                    <div className="flex justify-between gap-1">
                      {weekDays.map((day, index) => {
                        const done =
                          data.dailyRecords[day.key]?.habitStatus?.[habit.id] === true

                        const isFuture = day.key > todayKey

                        return (
                          <button
                            key={day.key}
                            onClick={() => toggleHabit(habit.id, day.key)}
                            disabled={isFuture}
                            aria-label={`${habit.title}, ${weekLabels[index]}`}
                            className={`flex h-7 min-w-0 flex-1 items-center justify-center rounded-full text-[10px] transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${
                              done
                                ? 'text-[#252525]'
                                : 'bg-[#f1ede6] text-[#aaa197]'
                            }`}
                            style={{
                              backgroundColor: done
                                ? habitColors[habitIndex % habitColors.length]
                                : undefined,
                            }}
                          >
                            {done ? <Check size={13} /> : '·'}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-1 flex justify-between">
                      {weekLabels.map((day) => (
                        <span
                          key={day}
                          className="flex-1 text-center text-[8px] text-[#999188]"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Personal milestones */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            Pencapaian Personal
          </h2>
          <span className="text-[9px] text-[#77716a]">
            Bukan perlombaan 🌿
          </span>
        </div>

        <div className="space-y-2">
          {milestones.map((item, index) => {
            const Icon = item.icon

            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-[2px_2px_0_#252525]"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h3 className="text-xs font-bold">
                      {item.title}
                    </h3>
                    <span className="text-[9px] font-bold text-[#625884]">
                      {milestoneStatus[index]}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#77716a]">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Weekly reflection */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            Refleksi Pekan Ini
          </h2>
          <span className="text-[9px] text-[#77716a]">
            Catatan Personal
          </span>
        </div>

        <div className="space-y-4 rounded-xl border-l-4 border-[#d9ccff] bg-white p-4 shadow-sm">
          {[
            {
              key: 'good' as const,
              title: 'Yang berjalan baik',
              color: '#bdeccf',
            },
            {
              key: 'improve' as const,
              title: 'Perlu dievaluasi',
              color: '#ffb5a7',
            },
            {
              key: 'next' as const,
              title: 'Fokus berikutnya',
              color: '#ffe69a',
            },
          ].map((item) => (
            <div key={item.key}>
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-bold">
                  {item.title}
                </span>
              </div>
              <p className="pl-4 text-[11px] leading-relaxed text-[#77716a]">
                {reflection[item.key] || 'Belum ada catatan.'}
              </p>
            </div>
          ))}

          <button
            onClick={() => {
  setDraftReflection({ ...reflection })
  setEditingReflection(true)
}}
            className="flex w-full items-center justify-end gap-2 border-t border-[#eee8df] pt-3 text-xs font-bold text-[#625884]"
          >
            <Pencil size={13} />
            Tulis Refleksi Baru
            <ChevronRight size={14} />
          </button>
        </div>
      </section>

      {/* Reflection modal */}
      {editingReflection && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40">
          <div className="w-full max-w-[480px] space-y-4 rounded-t-2xl bg-[#fffaf1] p-5 pb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">
                Refleksi Pekan Ini
              </h2>
              <button
                onClick={() => setEditingReflection(false)}
                aria-label="Tutup refleksi"
              >
                <X size={19} />
              </button>
            </div>

            {[
              { key: 'good' as const, label: 'Yang berjalan baik' },
              { key: 'improve' as const, label: 'Perlu dievaluasi' },
              { key: 'next' as const, label: 'Fokus berikutnya' },
            ].map((item) => (
              <div key={item.key} className="space-y-2">
                <label className="text-xs font-bold">
                  {item.label}
                </label>
                <textarea
                  rows={2}
                  value={draftReflection[item.key]}
                  onChange={(event) =>
                    setDraftReflection((current) => ({
                      ...current,
                      [item.key]: event.target.value,
                    }))
                  }
                  className="w-full resize-none rounded-lg bg-white p-3 text-xs outline-none focus:ring-1 focus:ring-[#252525]"
                />
              </div>
            ))}

            <button
              onClick={saveReflection}
              className="w-full rounded-lg bg-[#252525] py-3 text-xs font-bold text-white"
            >
              Simpan Refleksi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
