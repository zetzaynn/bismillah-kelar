import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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

const habitColorCycle = [
  '#FFE69A', // 1. Krem
  '#CDE8D3', // 2. Hijau Pudar (seperti ceklis target selesai)
  '#D9CCFF', // 3. Ungu
  '#93C5FD', // 4. Biru
  '#FFB5A7', // 5. Merah Muda
  '#FB923C', // 6. Oranye
]

function getHabitColor(title: string, index: number) {
  if (index < 3) {
    const normalized = title.toLowerCase()

    if (
      normalized.includes('mengaji') ||
      normalized.includes('quran') ||
      normalized.includes('tilawah')
    ) {
      return '#FFE69A'
    }

    if (
      normalized.includes('olahraga') ||
      normalized.includes('lari') ||
      normalized.includes('workout') ||
      normalized.includes('gym')
    ) {
      return '#CDE8D3'
    }

    if (
      normalized.includes('tidur') ||
      normalized.includes('istirahat')
    ) {
      return '#D9CCFF'
    }
  }

  return habitColorCycle[index % habitColorCycle.length]
}

const emptyReflection = {
  good: '',
  improve: '',
  next: '',
}

const milestones = [
  {
    title: 'Konsistensi 14 Hari',
    description: 'Membangun rutinitas menyelesaikan target harian.',
    requirement:
      'Selesaikan minimal 1 target atau agenda pada 14 hari berbeda dalam periode berjalan.',
    unit: 'hari produktif',
    target: 14,
    icon: Flame,
    color: '#FFE69A',
  },
  {
    title: 'Pembelajar Konsisten',
    description: 'Meluangkan waktu untuk membaca dan belajar.',
    requirement:
      'Tuntaskan minimal 5 target dalam periode berjalan.',
    unit: 'target selesai',
    target: 5,
    icon: BookOpen,
    color: '#BDECCF',
  },
  {
    title: 'Fokus Mendalam',
    description: 'Menyelesaikan sesi fokus tanpa gangguan.',
    requirement:
      'Selesaikan minimal 5 sesi timer fokus Pomodoro hingga tuntas dalam periode berjalan.',
    unit: 'sesi fokus',
    target: 5,
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

function formatShortDayMonth(date: Date) {
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
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<
    number | null
  >(null)

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

  const weekRange = `${formatShortDayMonth(monday)} – ${formatShortDayMonth(sunday)}`

  const monthlyLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(now)

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

  const milestoneCurrentValues = [
    productiveDays,
    completedTasks.length,
    totalFocusSessions,
  ]

  const milestoneStatus = milestones.map((item, index) =>
    milestoneCurrentValues[index] >= item.target
      ? 'Tercapai'
      : 'Dalam Proses',
  )

  const activeMilestone =
    selectedMilestoneIndex !== null
      ? {
          ...milestones[selectedMilestoneIndex],
          current: milestoneCurrentValues[selectedMilestoneIndex],
          status: milestoneStatus[selectedMilestoneIndex],
        }
      : null

  return (
    <div className="space-y-7 pb-24">
      {/* Header, Filter Pekan Ini & Ringkasan Capaian */}
      <section className="space-y-4">
        <div>
          <h1 className="text-[25px] font-bold leading-tight tracking-tight">
            Progres
          </h1>
          <p className="mt-1 text-sm text-[#77716a]">
            Lihat perkembangan kecil yang berarti, {profileName}.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowPeriod(!showPeriod)}
              className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#252525] bg-[#FFE69A] px-3.5 py-2 text-xs font-extrabold text-[#252525] shadow-[2px_2px_0_#252525] transition hover:bg-[#ffdf7e] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <CalendarDays size={14} />
              {period}
              <ChevronDown size={14} strokeWidth={2.5} />
            </button>

            {showPeriod && (
              <div className="absolute left-0 top-11 z-30 w-36 rounded-xl border-2 border-[#252525] bg-white p-2 shadow-[3px_3px_0_#252525]">
                {(['Pekan Ini', 'Bulan Ini'] as Period[]).map((item) => (
                  <button
                    key={item}
                    type="button"
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

          <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full border-2 border-[#252525] bg-[#252525] px-9 py-2 text-xs font-extrabold text-[#FFE69A] shadow-[2px_2px_0_#D9CCFF]">
            {period === 'Pekan Ini' ? weekRange : monthlyLabel}
          </span>
        </div>

        {/* Ringkasan Capaian (Header di luar bingkai kiri atas konsisten dengan fitur lainnya) */}
        <div className="space-y-3 pt-1">
          <div>
            <h2 className="text-base font-bold">
              Ringkasan Capaian
            </h2>
          </div>

          <div className="rounded-xl border-2 border-[#252525] bg-white p-4 shadow-[3px_3px_0_#252525]">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#252525] bg-[#93C5FD] p-3 shadow-[2px_2px_0_#252525]">
                <span className="h-3 w-3 shrink-0 rounded-full border border-[#252525] bg-white" />
                <div>
                  <p className="text-lg font-extrabold text-[#252525]">
                    {completedTasks.length}
                  </p>
                  <p className="text-[11px] font-extrabold text-[#1e3a8a]">
                    Target Beres
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#252525] bg-[#4ADE80] p-3 shadow-[2px_2px_0_#252525]">
                <span className="h-3 w-3 shrink-0 rounded-full border border-[#252525] bg-white" />
                <div>
                  <p className="text-lg font-extrabold text-[#252525]">
                    {completedAgenda.length}
                  </p>
                  <p className="text-[11px] font-extrabold text-[#14532d]">
                    Aktivitas Selesai
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#252525] bg-[#FFE69A] p-3 shadow-[2px_2px_0_#252525]">
                <span className="h-3 w-3 shrink-0 rounded-full border border-[#252525] bg-white" />
                <div>
                  <p className="text-lg font-extrabold text-[#252525]">
                    {productiveDays} hari
                  </p>
                  <p className="text-[11px] font-extrabold text-[#554507]">
                    Hari Produktif
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#252525] bg-[#D9CCFF] p-3 shadow-[2px_2px_0_#252525]">
                <span className="h-3 w-3 shrink-0 rounded-full border border-[#252525] bg-white" />
                <div>
                  <p className="text-lg font-extrabold text-[#252525]">
                    {habitPercentage}%
                  </p>
                  <p className="text-[11px] font-extrabold text-[#3b2f63]">
                    Tingkat Rutinitas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activity chart */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">
              Aktivitas Produktif
            </h2>
            <p className="mt-1 text-xs text-[#77716a]">
              Rata-rata {averageActivities} aktivitas selesai per hari
            </p>
          </div>

          <span className="shrink-0 rounded-full border-2 border-[#252525] bg-[#4ADE80] px-3 py-1 text-[11px] font-extrabold text-[#14532d] shadow-[2px_2px_0_#252525]">
            {totalCompleted} selesai
          </span>
        </div>

        <div className="rounded-xl border-2 border-[#252525] bg-white p-4 shadow-[3px_3px_0_#252525]">
          <div className="mb-3 flex justify-between text-[10px] text-[#999188]">
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
                  <span className="text-[10px] font-bold text-[#514b43]">
                    {item.value}
                  </span>

                  <div
                    className={`w-full max-w-7 rounded-t-md transition-all ${
                      item.value > 0
                        ? 'border border-[#252525] bg-[#93C5FD] shadow-[2px_2px_0_#252525]'
                        : 'bg-[#e8e3da]'
                    }`}
                    style={{
                      height: `${Math.max(height, 3)}%`,
                    }}
                  />

                  <span className="text-[10px] font-semibold text-[#77716a]">
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="mt-3 text-center text-[10px] text-[#999188]">
            Berdasarkan target dan agenda yang ditandai selesai.
          </p>
        </div>
      </section>

      {/* Statistik Sesi Fokus */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold">
            Statistik Sesi Fokus
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border-2 border-[#252525] bg-[#FB923C] p-4 text-[#252525] shadow-[3px_3px_0_#252525]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#252525] bg-white text-[#7c2d12]">
              <Clock3 size={18} />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-[#252525]">
              {totalFocusMinutes}
              <span className="ml-1 text-xs font-bold text-[#252525]/85">
                menit
              </span>
            </p>
            <p className="text-[11px] font-extrabold text-[#7c2d12]">
              Total waktu fokus
            </p>
          </div>

          <div className="rounded-xl border-2 border-[#252525] bg-[#4ADE80] p-4 text-[#252525] shadow-[3px_3px_0_#252525]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#252525] bg-white text-[#14532d]">
              <Brain size={18} />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-[#252525]">
              {totalFocusSessions}
            </p>
            <p className="text-[11px] font-extrabold text-[#14532d]">
              Sesi fokus selesai
            </p>
          </div>
        </div>

        <div className="rounded-xl border-2 border-[#252525] bg-white p-4 shadow-[3px_3px_0_#252525]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold">
                Rata-rata durasi sesi
              </p>
              <p className="mt-0.5 text-xs text-[#77716a]">
                Berdasarkan sesi fokus yang selesai
              </p>
            </div>
            <span className="text-lg font-extrabold underline decoration-[#FB923C] decoration-[3px] underline-offset-4">
              {averageFocusMinutes} menit
            </span>
          </div>
        </div>
      </section>

      {/* Rutinitas Sepekan */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold">
            Rutinitas Sepekan
          </h2>
          <p className="mt-1 text-xs text-[#77716a]">
            Terhubung langsung dengan Rutinitas Harian di Today.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border-2 border-[#252525] bg-white p-3.5 shadow-[3px_3px_0_#252525]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold">
              {completedHabitPoints}/{totalHabitPoints} aktivitas
            </span>
            <span className="rounded-full border border-[#252525] bg-[#4ADE80] px-2.5 py-0.5 text-[11px] font-extrabold text-[#14532d]">
              {habitPercentage}%
            </span>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#f1ede6]">
            <div
              className="h-full rounded-full bg-[#4ADE80] transition-all"
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

                const habitBadgeColor = getHabitColor(habit.title, habitIndex)

                return (
                  <div key={habit.id}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        {habit.title}
                      </span>
                      <span className="text-[11px] font-semibold text-[#77716a]">
                        {completed}/7 hari
                      </span>
                    </div>

                    <div className="flex justify-between gap-1.5">
                      {weekDays.map((day, index) => {
                        const done =
                          data.dailyRecords[day.key]?.habitStatus?.[habit.id] === true

                        const isFuture = day.key > todayKey

                        return (
                          <button
                            key={day.key}
                            type="button"
                            data-sound="check"
                            onClick={() => toggleHabit(habit.id, day.key)}
                            disabled={isFuture}
                            aria-label={`${habit.title}, ${weekLabels[index]}`}
                            className={`flex h-7 min-w-0 flex-1 items-center justify-center rounded-lg border-[1.5px] border-[#252525] text-[10px] font-extrabold transition active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 ${
                              done
                                ? 'text-[#252525] shadow-[2px_2px_0_#252525]'
                                : 'bg-[#f5f0e7] text-[#8a8278] shadow-[1.5px_1.5px_0_#252525]'
                            }`}
                            style={{
                              backgroundColor: done
                                ? habitBadgeColor
                                : undefined,
                            }}
                          >
                            {done ? <Check size={13} strokeWidth={2.8} /> : '·'}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-1.5 flex justify-between">
                      {weekLabels.map((day) => (
                        <span
                          key={day}
                          className="flex-1 text-center text-[9px] font-semibold text-[#999188]"
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

      {/* Pencapaian Personal */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            Pencapaian Personal
          </h2>
        </div>

        <div className="space-y-2.5">
          {milestones.map((item, index) => {
            const Icon = item.icon
            const achieved = milestoneStatus[index] === 'Tercapai'

            return (
              <button
                key={item.title}
                type="button"
                onClick={() => setSelectedMilestoneIndex(index)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-[#252525] bg-white p-3.5 text-left shadow-[3px_3px_0_#252525] transition hover:bg-[#fffdf7] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#252525] shadow-[2px_2px_0_#252525]"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold leading-snug text-[#252525]">
                    {item.title}
                  </h3>

                  <div className="mt-1.5">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full border border-[#252525] px-2.5 py-0.5 text-[10px] font-extrabold ${
                        achieved
                          ? 'bg-[#4ADE80] text-[#14532d]'
                          : 'bg-[#FB923C] text-[#252525]'
                      }`}
                    >
                      {milestoneStatus[index]}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs leading-relaxed text-[#77716a]">
                    {item.description}
                  </p>
                </div>

                <ChevronRight size={16} className="shrink-0 text-[#8a8278]" />
              </button>
            )
          })}
        </div>
      </section>

      {/* Refleksi Pekan Ini */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            Refleksi Pekan Ini
          </h2>
        </div>

        <div className="space-y-4 rounded-xl border-2 border-[#252525] bg-white p-4 shadow-[3px_3px_0_#252525]">
          {[
            {
              key: 'good' as const,
              title: 'Yang berjalan baik',
              badgeClass: 'bg-[#4ADE80] text-[#14532d]',
            },
            {
              key: 'improve' as const,
              title: 'Perlu dievaluasi',
              badgeClass: 'bg-[#FFB5A7] text-[#252525]',
            },
            {
              key: 'next' as const,
              title: 'Fokus berikutnya',
              badgeClass: 'bg-[#FFE69A] text-[#252525]',
            },
          ].map((item) => (
            <div key={item.key} className="space-y-1.5">
              <span
                className={`inline-block rounded-lg border-[1.5px] border-[#252525] px-3 py-1 text-xs font-extrabold shadow-[1.5px_1.5px_0_#252525] ${item.badgeClass}`}
              >
                {item.title}
              </span>
              <p className="text-sm leading-relaxed text-[#252525]">
                {reflection[item.key] || 'Belum ada catatan.'}
              </p>
            </div>
          ))}

          <div className="border-t border-[#eee8df] pt-3">
            <button
              type="button"
              onClick={() => {
                setDraftReflection({ ...reflection })
                setEditingReflection(true)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#252525] bg-[#FFE69A] px-4 py-3 text-sm font-extrabold text-[#252525] shadow-[2px_2px_0_#252525] transition hover:bg-[#ffdf7e] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <Pencil size={15} />
              <span>Tulis Refleksi Baru</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pop-up Detail Pencapaian Personal */}
      {activeMilestone &&
        createPortal(
          <div
            onClick={() => setSelectedMilestoneIndex(null)}
            className="fixed inset-0 z-[75] flex items-center justify-center bg-[#252525]/40 px-4 py-6 backdrop-blur-sm"
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#252525] shadow-[2px_2px_0_#252525]"
                    style={{ backgroundColor: activeMilestone.color }}
                  >
                    {(() => {
                      const Icon = activeMilestone.icon
                      return <Icon size={21} />
                    })()}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold">
                      {activeMilestone.title}
                    </h3>
                    <span
                      className={`mt-1 inline-block rounded-full border border-[#252525] px-2.5 py-0.5 text-[10px] font-extrabold ${
                        activeMilestone.status === 'Tercapai'
                          ? 'bg-[#4ADE80] text-[#14532d]'
                          : 'bg-[#FB923C] text-[#252525]'
                      }`}
                    >
                      {activeMilestone.status}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMilestoneIndex(null)}
                  aria-label="Tutup detail pencapaian"
                  className="rounded-lg bg-[#f1ede6] p-1.5 hover:bg-[#e5dfd3]"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-[#252525]/20 bg-white p-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#77716a]">
                  Syarat Pencapaian
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#252525]">
                  {activeMilestone.requirement}
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-[#252525]/20 bg-white p-3.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Progres ({period})</span>
                  <span>
                    {Math.min(activeMilestone.current, activeMilestone.target)} /{' '}
                    {activeMilestone.target} {activeMilestone.unit}
                  </span>
                </div>

                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full border border-[#252525]/20 bg-[#f1ede6]">
                  <div
                    className="h-full rounded-full bg-[#4ADE80] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (activeMilestone.current / activeMilestone.target) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-[#77716a]">
                  {activeMilestone.status === 'Tercapai'
                    ? 'MasyaAllah, pencapaian ini sudah berhasil kamu raih!'
                    : `Butuh ${Math.max(
                        0,
                        activeMilestone.target - activeMilestone.current,
                      )} ${activeMilestone.unit} lagi untuk membuka lencana ini.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMilestoneIndex(null)}
                className="mt-4 w-full rounded-xl border-2 border-[#252525] bg-[#FFE69A] py-2.5 text-xs font-extrabold shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Mengerti
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Reflection modal */}
      {editingReflection &&
        createPortal(
          <div
            onClick={() => setEditingReflection(false)}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-[#252525]/40 backdrop-blur-sm sm:items-center sm:px-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              className="max-h-[90vh] w-full max-w-[480px] space-y-4 overflow-y-auto rounded-t-2xl border-t-2 border-[#252525] bg-[#fffaf1] p-5 pb-8 shadow-2xl sm:rounded-2xl sm:border-2 sm:shadow-[5px_5px_0_#252525]"
            >
              <div className="mx-auto h-1 w-12 rounded-full bg-[#d8d0c4] sm:hidden" />

              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  Refleksi Pekan Ini
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingReflection(false)}
                  aria-label="Tutup refleksi"
                  className="rounded-full p-2 hover:bg-[#f0ece4]"
                >
                  <X size={19} />
                </button>
              </div>

              {[
                {
                  key: 'good' as const,
                  label: 'Yang berjalan baik',
                  badgeClass: 'bg-[#4ADE80] text-[#14532d]',
                  placeholder: 'Hal-hal yang patut disyukuri pekan ini...',
                },
                {
                  key: 'improve' as const,
                  label: 'Perlu dievaluasi',
                  badgeClass: 'bg-[#FFB5A7] text-[#252525]',
                  placeholder: 'Kendala atau rutinitas yang perlu diperbaiki...',
                },
                {
                  key: 'next' as const,
                  label: 'Fokus berikutnya',
                  badgeClass: 'bg-[#FFE69A] text-[#252525]',
                  placeholder: 'Prioritas utama untuk pekan depan...',
                },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <label className="inline-block">
                    <span
                      className={`inline-block rounded-lg border-[1.5px] border-[#252525] px-2.5 py-1 text-xs font-extrabold ${item.badgeClass}`}
                    >
                      {item.label}
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder={item.placeholder}
                    value={draftReflection[item.key]}
                    onChange={(event) =>
                      setDraftReflection((current) => ({
                        ...current,
                        [item.key]: event.target.value,
                      }))
                    }
                    className="w-full resize-none rounded-xl border-2 border-[#252525] bg-white p-3 text-sm text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReflection(false)}
                  className="rounded-xl px-4 py-3 text-xs font-semibold text-[#77716a] hover:bg-[#f0ece4]"
                >
                  Batal
                </button>

                <button
                  type="button"
                  data-sound="success"
                  onClick={saveReflection}
                  className="flex-1 rounded-xl border-2 border-[#252525] bg-[#252525] px-5 py-3 text-xs font-bold text-white shadow-[3px_3px_0_#fae195] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:flex-none"
                >
                  Simpan Refleksi
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}