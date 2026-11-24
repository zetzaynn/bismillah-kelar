import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Clock3,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

import { useAppData } from '../hooks/AppContext'
import type { AgendaItem } from '../types/app'
import { getIndonesiaEvents } from '../data/indonesiaHolidays'

type CalendarView = 'Bulan' | 'Pekan' | 'Agenda'

type EditingAgenda = {
  id: number
  date: string
}

type DeleteTarget = {
  id: number
  date: string
  title: string
}

const pad = (value: number) => String(value).padStart(2, '0')

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April',
  'Mei', 'Juni', 'Juli', 'Agustus',
  'September', 'Oktober', 'November', 'Desember',
]

const weekdayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const categories = [
  { name: 'Kuliah', color: '#ffb5a7' },
  { name: 'Tugas', color: '#d9ccff' },
  { name: 'Ibadah', color: '#bdeccf' },
  { name: 'Pribadi', color: '#ffe69a' },
  { name: 'Organisasi', color: '#a9d6e5' },
  { name: 'Lainnya', color: '#d8d0c4' },
]

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getEventColor(type: string) {
  if (type === 'libur') return '#ba1a1a'
  if (type === 'cuti') return '#d97706'
  return '#93C5FD'
}

function getEventLabel(type: string) {
  if (type === 'libur') return 'Libur nasional'
  if (type === 'cuti') return 'Cuti bersama'
  return 'Hari peringatan'
}

function getEventCardStyle(type: string) {
  if (type === 'libur') {
    return {
      card: 'border-2 border-[#252525] bg-[#FFB5A7] shadow-[3px_3px_0_#252525]',
      dot: 'border border-[#252525] bg-[#ba1a1a]',
      badge: 'border border-[#252525] bg-[#ba1a1a] text-white',
    }
  }

  if (type === 'cuti') {
    return {
      card: 'border-2 border-[#252525] bg-[#FB923C] shadow-[3px_3px_0_#252525]',
      dot: 'border border-[#252525] bg-white',
      badge: 'border border-[#252525] bg-white text-[#7c2d12]',
    }
  }

  return {
    card: 'border-2 border-[#252525] bg-[#93C5FD] shadow-[3px_3px_0_#252525]',
    dot: 'border border-[#252525] bg-white',
    badge: 'border border-[#252525] bg-white text-[#1e3a8a]',
  }
}

function NationalEventList({ date }: { date: Date }) {
  const events = getIndonesiaEvents(date)

  if (events.length === 0) return null

  return (
    <div className="space-y-2.5">
      {events.map((event, index) => {
        const style = getEventCardStyle(event.type)

        return (
          <div
            key={`${event.name}-${index}`}
            className={`rounded-xl p-3.5 ${style.card}`}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                />

                <div>
                  <p className="text-xs font-extrabold leading-snug text-[#252525]">
                    {event.name}
                  </p>
                  <span
                    className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${style.badge}`}
                  >
                    {getEventLabel(event.type)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Calendar() {
  const {
    data,
    addAgenda,
    updateAgenda,
    deleteAgenda,
  } = useAppData()

  const now = new Date()
  const todayKey = dateKey(now)

  const [displayMonth, setDisplayMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  )

  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [view, setView] = useState<CalendarView>('Bulan')
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(now.getFullYear())

  const [agendaActionMode, setAgendaActionMode] = useState<
    'normal' | 'edit' | 'delete'
  >('normal')

  const [showForm, setShowForm] = useState(false)
  const [editingAgenda, setEditingAgenda] = useState<EditingAgenda | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState(selectedDate)
  const [formTime, setFormTime] = useState('20:00')
  const [formCategory, setFormCategory] = useState('Pribadi')
  const [formError, setFormError] = useState('')

  const agenda = data.agenda
  const selected = new Date(`${selectedDate}T00:00:00`)
  const selectedAgenda = agenda[selectedDate] ?? []

  const days = useMemo(() => {
    const firstDay = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
      1,
    )

    const startOffset = (firstDay.getDay() + 6) % 7
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - startOffset)

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + index)

      return {
        date,
        key: dateKey(date),
        number: date.getDate(),
        currentMonth: date.getMonth() === displayMonth.getMonth(),
        today: dateKey(date) === todayKey,
      }
    })
  }, [displayMonth, todayKey])

  function applyMonthSelection(year: number, monthIndex: number) {
    const nextMonthDate = new Date(year, monthIndex, 1)
    setDisplayMonth(nextMonthDate)
    setSelectedDate(dateKey(nextMonthDate))
    setAgendaActionMode('normal')
  }

  function changeMonth(amount: number) {
    const nextMonthDate = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth() + amount,
      1,
    )
    applyMonthSelection(
      nextMonthDate.getFullYear(),
      nextMonthDate.getMonth(),
    )
  }

  function openMonthPicker() {
    setPickerYear(displayMonth.getFullYear())
    setShowMonthPicker(true)
  }

  function jumpToMonth(monthIndex: number) {
    applyMonthSelection(pickerYear, monthIndex)
    setShowMonthPicker(false)
  }

  function selectDay(key: string) {
    setSelectedDate(key)
    setAgendaActionMode('normal')
  }

  function toggleAgendaItem(id: number) {
    const item = selectedAgenda.find(
      (agendaItem) => agendaItem.id === id,
    )

    if (!item) return

    updateAgenda(selectedDate, id, {
      done: !item.done,
    })
  }

  function openAddForm() {
    setAgendaActionMode('normal')
    setEditingAgenda(null)
    setFormTitle('')
    setFormDate(selectedDate)
    setFormTime('20:00')
    setFormCategory('Pribadi')
    setFormError('')
    setShowForm(true)
  }

  function openEditForm(item: AgendaItem) {
    setAgendaActionMode('normal')
    setEditingAgenda({
      id: item.id,
      date: selectedDate,
    })

    setFormTitle(item.title)
    setFormDate(selectedDate)
    setFormTime(item.time)
    setFormCategory(
      categories.some((category) => category.name === item.category)
        ? item.category
        : 'Lainnya',
    )
    setFormError('')
    setShowForm(true)
  }

  function handleAgendaCardClick(item: AgendaItem) {
    if (agendaActionMode === 'edit') {
      openEditForm(item)
      return
    }

    if (agendaActionMode === 'delete') {
      setAgendaActionMode('normal')
      setDeleteTarget({
        id: item.id,
        date: selectedDate,
        title: item.title,
      })
      return
    }

    toggleAgendaItem(item.id)
  }

  function closeForm() {
    setShowForm(false)
    setEditingAgenda(null)
    setFormError('')
  }

  function saveSchedule() {
    if (!formTitle.trim()) {
      setFormError('Nama kegiatan belum diisi.')
      return
    }

    if (!formDate || !formTime) {
      setFormError('Tanggal dan waktu wajib diisi.')
      return
    }

    const category = categories.find(
      (item) => item.name === formCategory,
    )

    const color = category?.color ?? '#d8d0c4'

    if (editingAgenda) {
      const oldItem = (agenda[editingAgenda.date] ?? []).find(
        (item) => item.id === editingAgenda.id,
      )

      if (!oldItem) {
        setFormError('Jadwal tidak ditemukan. Silakan coba lagi.')
        return
      }

      const updatedItem: AgendaItem = {
        ...oldItem,
        title: formTitle.trim(),
        time: formTime,
        category: formCategory,
        color,
      }

      if (editingAgenda.date === formDate) {
        updateAgenda(editingAgenda.date, editingAgenda.id, updatedItem)
      } else {
        deleteAgenda(editingAgenda.date, editingAgenda.id)
        addAgenda(formDate, updatedItem)
      }
    } else {
      const newItem: AgendaItem = {
        id: Date.now(),
        title: formTitle.trim(),
        time: formTime,
        category: formCategory,
        color,
        done: false,
      }

      addAgenda(formDate, newItem)
    }

    setSelectedDate(formDate)
    setDisplayMonth(new Date(`${formDate}T00:00:00`))
    setView('Bulan')
    closeForm()
  }

  function confirmDelete() {
    if (!deleteTarget) return

    deleteAgenda(deleteTarget.date, deleteTarget.id)
    setDeleteTarget(null)
  }

  const mondayOffset = (selected.getDay() + 6) % 7

  const weekStart = new Date(selected)
  weekStart.setDate(selected.getDate() - mondayOffset)

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)

    return {
      date,
      key: dateKey(date),
      number: date.getDate(),
      currentMonth: date.getMonth() === displayMonth.getMonth(),
      today: dateKey(date) === todayKey,
    }
  })

  const visibleDays = view === 'Pekan' ? weekDays : days

  const agendaDates = Array.from(
    new Set([
      ...Object.keys(agenda).filter(
        (key) => key >= todayKey && (agenda[key] ?? []).length > 0,
      ),
      ...days
        .filter((day) => day.key >= todayKey)
        .filter((day) => getIndonesiaEvents(day.date).length > 0)
        .map((day) => day.key),
    ]),
  ).sort()

  const completedAgendaCount = selectedAgenda.filter(
    (item) => item.done,
  ).length

  return (
    <div className="space-y-6 pb-24">
      {/* Header kalender */}
      <section className="space-y-3.5">
        <div>
          <h1 className="text-[25px] font-bold leading-tight tracking-tight">
            Kalender
          </h1>
          <p className="mt-1 text-sm text-[#77716a]">
            Atur waktu, rencana, dan komitmen pribadimu.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-0.5">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => {
                setDisplayMonth(
                  new Date(now.getFullYear(), now.getMonth(), 1),
                )
                setSelectedDate(todayKey)
                setAgendaActionMode('normal')
              }}
              className="rounded-lg border-[1.5px] border-[#252525] bg-[#FFE69A] px-3 py-2 text-xs font-extrabold text-[#252525] shadow-[2px_2px_0_#252525] transition hover:bg-[#ffdf7e] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Hari Ini
            </button>
          </div>

          <button
            type="button"
            onClick={openMonthPicker}
            aria-label="Pilih bulan dan tahun"
            className="flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-transparent px-2.5 py-1.5 transition hover:border-[#252525] hover:bg-[#f5f0e7]"
          >
            <h2 className="text-base font-extrabold sm:text-lg">
              {monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear()}
            </h2>
            <ChevronDown size={17} strokeWidth={2.5} className="text-[#252525]" />
          </button>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Bulan sebelumnya"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#252525] bg-[#ffe69a] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ChevronLeft size={20} strokeWidth={2.8} />
            </button>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Bulan berikutnya"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#252525] bg-[#ffe69a] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ChevronRight size={20} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      </section>

      {/* Pilihan tampilan */}
      <section>
        <div className="grid w-full grid-cols-3 gap-2">
          {(['Bulan', 'Pekan', 'Agenda'] as CalendarView[]).map((item) => {
            const isSelected = view === item

            return (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`min-w-0 rounded-xl border-[1.5px] px-2 py-3 text-xs font-bold transition-all duration-150 ${
                  isSelected
                    ? 'translate-x-[2px] translate-y-[2px] border-[#252525]/75 bg-[#f7e5ab] text-[#252525]/80 shadow-none'
                    : 'border-[#252525] bg-[#ffe69a] text-[#252525] shadow-[2px_2px_0_#252525] hover:bg-[#ffdf7e] active:translate-x-[2px] active:translate-y-[2px] active:bg-[#f7e5ab] active:shadow-none'
                }`}
              >
                {item}
              </button>
            )
          })}
        </div>
      </section>

      {/* Kalender bulanan dan pekanan */}
      {view !== 'Agenda' && (
        <section className="rounded-xl border-2 border-[#252525] bg-white p-3 shadow-[3px_3px_0_#252525]">
          <div className="overflow-hidden rounded-lg">
            <div className="grid grid-cols-7 border-b border-[#dfd7cb] bg-[#f5f0e7]">
              {weekdayNames.map((day, index) => (
                <div
                  key={day}
                  className={`border-r border-[#dfd7cb] py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wide last:border-r-0 ${
                    index === 6 ? 'bg-[#fcebea] text-[#ba1a1a]' : 'text-[#514b43]'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 bg-white">
              {visibleDays.map((day, index) => {
                const active = selectedDate === day.key
                const items = agenda[day.key] ?? []
                const nationalEvents = getIndonesiaEvents(day.date)

                const hasHoliday = nationalEvents.some(
                  (event) => event.type === 'libur',
                )

                const hasLeave = nationalEvents.some(
                  (event) => event.type === 'cuti',
                )

                const hasObservance = nationalEvents.some(
                  (event) => event.type === 'peringatan',
                )

                const dateColor = hasHoliday
                  ? 'text-[#ba1a1a]'
                  : hasLeave
                    ? 'text-[#d97706]'
                    : hasObservance
                      ? 'font-bold text-[#93C5FD]'
                      : day.date.getDay() === 0
                        ? 'text-[#ba1a1a]'
                        : ''

                const isLastColumn = (index + 1) % 7 === 0
                const isLastRow = index >= visibleDays.length - 7

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => selectDay(day.key)}
                    aria-label={`${formatLongDate(day.date)}${
                      nationalEvents.length
                        ? `, ${nationalEvents.map((event) => event.name).join(', ')}`
                        : ''
                    }`}
                    className={`flex min-h-[54px] flex-col items-center justify-center py-1.5 transition ${
                      !isLastColumn ? 'border-r border-[#e8e1d5]' : ''
                    } ${!isLastRow ? 'border-b border-[#e8e1d5]' : ''} ${
                      active
                        ? 'bg-[#ffe69a] font-extrabold text-[#252525]'
                        : day.today
                          ? 'bg-[#ede6ff] font-bold'
                          : 'bg-white hover:bg-[#faf5ec]'
                    } ${
                      !day.currentMonth && view === 'Bulan'
                        ? 'bg-[#faf7f2] opacity-35'
                        : ''
                    }`}
                  >
                    <span className={`text-xs ${dateColor}`}>
                      {day.number}
                    </span>

                    <span className="mt-1 flex h-2 items-center gap-0.5">
                      {hasHoliday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ba1a1a]" />
                      )}

                      {hasLeave && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
                      )}

                      {hasObservance && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#93C5FD]" />
                      )}

                      {items.slice(0, 2).map((item) => (
                        <span
                          key={item.id}
                          className="h-1.5 w-1.5 rounded-full border border-[#252525]/30"
                          style={{ backgroundColor: item.color }}
                        />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#eee8df] pt-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ba1a1a]" />
              <span className="text-[10px] text-[#77716a]">
                Libur nasional
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#d97706]" />
              <span className="text-[10px] text-[#77716a]">
                Cuti bersama
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#93C5FD]" />
              <span className="text-[10px] text-[#77716a]">
                Hari peringatan
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#b19ae9]" />
              <span className="text-[10px] text-[#77716a]">
                Aktivitas
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Tampilan agenda */}
      {view === 'Agenda' && (
        <section className="space-y-3">
          <h2 className="text-base font-bold">
            Agenda dan Hari Nasional Mendatang
          </h2>

          {agendaDates.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-[#c7beb0] bg-white p-5 text-center text-xs text-[#77716a]">
              Belum ada agenda atau hari nasional mendatang.
            </p>
          ) : (
            agendaDates.map((key) => {
              const date = new Date(`${key}T00:00:00`)
              const events = getIndonesiaEvents(date)
              const items = agenda[key] ?? []

              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedDate(key)
                    setDisplayMonth(
                      new Date(date.getFullYear(), date.getMonth(), 1),
                    )
                    setView('Bulan')
                  }}
                  className="w-full rounded-xl border-2 border-[#252525] bg-white p-4 text-left shadow-[3px_3px_0_#252525] transition hover:bg-[#fffaf1]"
                >
                  <p className="text-sm font-bold">
                    {formatLongDate(date)}
                  </p>

                  {events.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {events.map((event, index) => (
                        <div
                          key={`${event.name}-${index}`}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: getEventColor(event.type),
                            }}
                          />
                          <span className="text-xs font-semibold text-[#4f493f]">
                            {event.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {items.length > 0 && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#252525] bg-[#4ADE80] px-2.5 py-0.5 text-[11px] font-extrabold text-[#14532d]">
                      {items.length} aktivitas
                    </span>
                  )}
                </button>
              )
            })
          )}
        </section>
      )}

      {/* Detail agenda tanggal terpilih:
1. Tanggal -> 2. Hari nasional -> 3. Aktivitas terselesaikan -> 4. CRUD terpusat di tengah -> 5. Output jadwal */}
      <section className="space-y-3.5">
        {/* 1. Baris Tanggal */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">
            {formatLongDate(selected)}
          </h2>

          <span className="shrink-0 rounded-full border border-[#252525] bg-[#FB923C] px-3 py-1 text-[11px] font-extrabold text-[#252525]">
            {selectedAgenda.filter((item) => !item.done).length} sisa
          </span>
        </div>

        {/* 2. Informasi Hari Nasional Tepat di Bawah Tanggal */}
        <NationalEventList date={selected} />

        {/* 3. Progress Aktivitas Terselesaikan */}
        <div className="rounded-xl border-[1.5px] border-[#252525] bg-[#f1ede6] p-3 shadow-[2px_2px_0_#252525]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#252525]">
              <span className="h-2.5 w-2.5 rounded-full border border-[#252525] bg-[#4ADE80]" />
              Aktivitas terselesaikan
            </span>
            <span className="rounded-full border border-[#252525] bg-[#4ADE80] px-2.5 py-0.5 text-[11px] font-extrabold text-[#14532d]">
              {completedAgendaCount}/{selectedAgenda.length}
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-[#252525] bg-white">
            <div
              className="h-full rounded-full bg-[#4ADE80] transition-all"
              style={{
                width: selectedAgenda.length
                  ? `${
                      (completedAgendaCount / selectedAgenda.length) * 100
                    }%`
                  : '0%',
              }}
            />
          </div>
        </div>

        {/* 4. Baris CRUD di Tengah */}
        <div className="flex items-center justify-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={openAddForm}
            className="flex h-9 w-44 items-center justify-center gap-1.5 rounded-xl border-2 border-[#252525] bg-[#D9CCFF] px-3 text-[11px] font-extrabold text-[#252525] shadow-[2px_2px_0_#252525] transition hover:bg-[#cfc0ff] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Tambah Jadwal</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setAgendaActionMode((current) =>
                current === 'edit' ? 'normal' : 'edit',
              )
            }
            aria-label="Edit jadwal"
            aria-pressed={agendaActionMode === 'edit'}
            title="Edit jadwal"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#252525] text-[#252525] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
              agendaActionMode === 'edit'
                ? 'translate-x-[2px] translate-y-[2px] bg-[#f7d874] shadow-none'
                : 'bg-[#ffe69a] shadow-[2px_2px_0_#252525]'
            }`}
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={() =>
              setAgendaActionMode((current) =>
                current === 'delete' ? 'normal' : 'delete',
              )
            }
            aria-label="Hapus jadwal"
            aria-pressed={agendaActionMode === 'delete'}
            title="Hapus jadwal"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#252525] text-[#252525] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
              agendaActionMode === 'delete'
                ? 'translate-x-[2px] translate-y-[2px] bg-[#ff9e8d] shadow-none'
                : 'bg-[#ffb5a7] shadow-[2px_2px_0_#252525]'
            }`}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {agendaActionMode !== 'normal' && (
          <p className="rounded-lg bg-[#f5f0e7] px-3 py-2 text-center text-xs font-medium text-[#77716a]">
            {agendaActionMode === 'edit'
              ? 'Pilih jadwal di bawah yang ingin diedit.'
              : 'Pilih jadwal di bawah yang ingin dihapus.'}
            <button
              type="button"
              onClick={() => setAgendaActionMode('normal')}
              className="ml-2 font-bold text-[#252525] underline"
            >
              Batal
            </button>
          </p>
        )}

        {/* 5. Output dari Tambah Jadwal */}
        {selectedAgenda.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#c7beb0] bg-white px-4 py-9 text-center">
            <CalendarDays size={28} className="mx-auto text-[#aaa197]" />
            <p className="mt-3 text-sm font-bold">
              Belum ada jadwal
            </p>
            <p className="mt-1 text-xs text-[#77716a]">
              Hari ini masih bisa kamu isi dengan hal produktif.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedAgenda
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  data-sound={agendaActionMode === 'normal' ? 'check' : 'click'}
                  onClick={() => handleAgendaCardClick(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleAgendaCardClick(item)
                    }
                  }}
                  className={`cursor-pointer select-none rounded-xl border-2 border-[#252525] p-3.5 shadow-[3px_3px_0_#252525] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                    agendaActionMode === 'edit'
                      ? 'bg-[#fff3c4]'
                      : agendaActionMode === 'delete'
                        ? 'bg-[#ffe0d9]'
                        : item.done
                          ? 'bg-[#BDECCF]'
                          : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#252525] ${
                        agendaActionMode === 'edit'
                          ? 'bg-[#ffe69a] text-[#252525]'
                          : agendaActionMode === 'delete'
                            ? 'bg-[#ffb5a7] text-[#252525]'
                            : item.done
                              ? 'bg-[#252525] text-white'
                              : 'bg-white'
                      }`}
                    >
                      {agendaActionMode === 'edit' ? (
                        <Pencil size={12} strokeWidth={2.5} />
                      ) : agendaActionMode === 'delete' ? (
                        <Trash2 size={12} strokeWidth={2.5} />
                      ) : (
                        item.done && <Check size={13} strokeWidth={2.8} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm font-bold leading-snug ${
                            item.done ? 'line-through text-[#1e4620]' : ''
                          }`}
                        >
                          {item.title}
                        </h3>

                        <span
                          className="shrink-0 rounded border border-[#252525]/20 px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: item.done
                              ? 'rgba(255,255,255,0.8)'
                              : `${item.color}88`,
                          }}
                        >
                          {item.done ? 'Selesai' : 'Aktif'}
                        </span>
                      </div>

                      <div
                        className={`mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold ${
                          item.done ? 'text-[#1e4620]' : 'text-[#77716a]'
                        }`}
                      >
                        <Clock3 size={12} />
                        {item.time} WIB
                        <span>•</span>
                        {item.category}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Modal Pemilih Bulan & Tahun */}
      {showMonthPicker &&
        createPortal(
          <div
            onClick={() => setShowMonthPicker(false)}
            className="fixed inset-0 z-[75] flex items-center justify-center bg-[#252525]/40 px-4 py-6 backdrop-blur-sm"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Pilih bulan dan tahun"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-xs rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-4 shadow-[5px_5px_0_#252525]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-extrabold">
                  Pilih Bulan &amp; Tahun
                </span>
                <button
                  type="button"
                  onClick={() => setShowMonthPicker(false)}
                  aria-label="Tutup pemilih bulan"
                  className="rounded-lg bg-[#f1ede6] p-1.5 hover:bg-[#e5dfd3]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-4 flex items-center justify-between rounded-xl border-[1.5px] border-[#252525] bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y - 1)}
                  aria-label="Tahun sebelumnya"
                  className="rounded-lg bg-[#f5f0e7] p-1.5 hover:bg-[#ffe69a]"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="text-base font-extrabold">{pickerYear}</span>

                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y + 1)}
                  aria-label="Tahun berikutnya"
                  className="rounded-lg bg-[#f5f0e7] p-1.5 hover:bg-[#ffe69a]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {monthNames.map((month, index) => {
                  const isCurrentSelection =
                    displayMonth.getMonth() === index &&
                    displayMonth.getFullYear() === pickerYear

                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => jumpToMonth(index)}
                      className={`rounded-xl border-[1.5px] py-2.5 text-xs font-bold transition ${
                        isCurrentSelection
                          ? 'border-[#252525] bg-[#FFE69A] shadow-[2px_2px_0_#252525]'
                          : 'border-[#e3dbcf] bg-white hover:border-[#252525] hover:bg-[#f5f0e7]'
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal tambah dan edit jadwal */}
      {showForm &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#252525]/40 px-4 py-6 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeForm()
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    {editingAgenda ? 'Edit Jadwal' : 'Tambah Jadwal'}
                  </h2>
                  <p className="mt-1 text-xs text-[#77716a]">
                    {editingAgenda
                      ? 'Perbarui informasi kegiatanmu.'
                      : 'Catat kegiatan yang ingin kamu lakukan.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="Tutup formulir"
                  className="rounded-lg bg-[#f1ede6] p-2 hover:bg-[#e5dfd3]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    Nama kegiatan
                  </label>
                  <textarea
                    autoFocus
                    rows={1}
                    enterKeyHint="done"
                    value={formTitle}
                    onChange={(event) => {
                      setFormTitle(event.target.value.replace(/\r?\n/g, ''))
                      setFormError('')
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                    placeholder="Contoh: Mengerjakan tugas kuliah"
                    className="w-full resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white px-3 py-3 text-sm text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(event) => setFormDate(event.target.value)}
                      className="w-full min-w-0 rounded-xl border-[1.5px] border-[#252525] bg-white px-3 py-3 text-xs font-semibold outline-none focus:bg-[#ffe69a]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold">
                      Waktu
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(event) => setFormTime(event.target.value)}
                      className="w-full rounded-xl border-[1.5px] border-[#252525] bg-white px-3 py-3 text-xs font-semibold outline-none focus:bg-[#ffe69a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    Kategori
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.name}
                        type="button"
                        onClick={() => setFormCategory(category.name)}
                        className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-xs font-bold transition ${
                          formCategory === category.name
                            ? 'border-[#252525] bg-[#ffe69a] shadow-[2px_2px_0_#252525]'
                            : 'border-[#ddd4c7] bg-white hover:border-[#252525]'
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-[#252525]"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {formError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {formError}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 rounded-xl border-[1.5px] border-[#252525] bg-white px-4 py-3 text-xs font-bold hover:bg-[#f5f0e7]"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    data-sound="success"
                    onClick={saveSchedule}
                    className="flex-1 rounded-xl border-2 border-[#252525] bg-[#D9CCFF] px-4 py-3 text-xs font-extrabold text-[#252525] shadow-[3px_3px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    {editingAgenda ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal konfirmasi hapus */}
      {deleteTarget &&
        createPortal(
          <div
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#252525]/40 px-4 py-6 backdrop-blur-sm"
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
                Hapus jadwal ini?
              </h2>

              <p className="mt-2 text-center text-xs leading-relaxed text-[#77716a]">
                Jadwal <strong className="text-[#252525]">{deleteTarget.title}</strong> akan dihapus secara permanen dari kalender.
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border-[1.5px] border-[#252525] bg-white px-4 py-3 text-xs font-bold"
                >
                  Batal
                </button>

                <button
                  type="button"
                  data-sound="success"
                  onClick={confirmDelete}
                  className="flex-1 rounded-xl border-2 border-[#252525] bg-[#FFB5A7] px-4 py-3 text-xs font-extrabold text-[#252525] shadow-[2px_2px_0_#252525]"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}