
import { useMemo, useState } from 'react'
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
  return '#3976b9'
}

function getEventLabel(type: string) {
  if (type === 'libur') return 'Libur nasional'
  if (type === 'cuti') return 'Cuti bersama'
  return 'Hari peringatan'
}

function getEventBackground(type: string) {
  if (type === 'libur') return 'border-red-100 bg-red-50'
  if (type === 'cuti') return 'border-orange-100 bg-orange-50'
  return 'border-blue-100 bg-blue-50'
}

function NationalEventList({ date }: { date: Date }) {
  const events = getIndonesiaEvents(date)

  if (events.length === 0) return null

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div
          key={`${event.name}-${index}`}
          className={`rounded-xl border p-3 ${getEventBackground(event.type)}`}
        >
          <div className="flex items-start gap-2">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: getEventColor(event.type) }}
            />

            <div>
              <p className="text-xs font-bold text-[#252525]">
                {event.name}
              </p>
              <p
                className="mt-1 text-[10px] font-semibold"
                style={{ color: getEventColor(event.type) }}
              >
                {getEventLabel(event.type)}
              </p>
            </div>
          </div>
        </div>
      ))}
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

  const totalActivities = Object.values(agenda).reduce(
    (sum, items) => sum + items.length,
    0,
  )

  function changeMonth(amount: number) {
    setDisplayMonth((current) =>
      new Date(
        current.getFullYear(),
        current.getMonth() + amount,
        1,
      ),
    )
  }

  function selectDay(key: string) {
    setSelectedDate(key)
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
    setEditingAgenda(null)
    setFormTitle('')
    setFormDate(selectedDate)
    setFormTime('20:00')
    setFormCategory('Pribadi')
    setFormError('')
    setShowForm(true)
  }

  function openEditForm(item: AgendaItem) {
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

  // Buat tujuh tanggal berdasarkan pekan yang dipilih.
  // Tidak bergantung pada rentang 42 hari kalender bulanan.
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

  return (
    <div className="space-y-6 pb-24">

      {/* Header kalender */}
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Kalender
          </h1>
          <p className="mt-1 text-xs text-[#77716a]">
            Atur waktu, rencana, dan komitmen pribadimu.
          </p>
        </div>

        {/* Navigasi bulan */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex justify-start">
            <button
              onClick={() => {
                setDisplayMonth(
                  new Date(now.getFullYear(), now.getMonth(), 1),
                )
                setSelectedDate(todayKey)
              }}
              className="rounded-lg border border-[#e4ddd2] bg-[#f1ede6] px-3 py-2 text-[10px] font-bold transition hover:bg-[#e9e2d7]"
            >
              Hari Ini
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <h2 className="text-base font-extrabold sm:text-lg">
              {monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear()}
            </h2>
            <ChevronDown size={17} className="text-[#77716a]" />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => changeMonth(-1)}
              aria-label="Bulan sebelumnya"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#252525] bg-[#ffe69a] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ChevronLeft size={20} strokeWidth={2.8} />
            </button>

            <button
              onClick={() => changeMonth(1)}
              aria-label="Bulan berikutnya"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#252525] bg-[#ffe69a] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ChevronRight size={20} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      </section>

      {/* Ringkasan dan pilihan tampilan */}
      <section className="space-y-3">
        <div className="inline-flex rounded-full border border-[#e5ddd1] bg-[#f1ede6] px-3 py-2 text-[10px] font-semibold text-[#625b52]">
          <span className="mr-1.5 text-[#9b7bd8]">●</span>
          {totalActivities} aktivitas tersimpan
        </div>

        {/* Tab full-width */}
        <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-[#e5ddd1] bg-[#ece8e0] p-1">
          {(['Bulan', 'Pekan', 'Agenda'] as CalendarView[]).map((item) => (
            <button
              key={item}
              onClick={() => setView(item)}
              className={`min-w-0 rounded-lg px-2 py-3 text-xs font-bold transition ${
                view === item
                  ? 'border border-[#252525] bg-[#ffe69a] text-[#252525] shadow-[2px_2px_0_#252525]'
                  : 'text-[#77716a] hover:bg-white/60'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* Kalender bulanan dan pekanan */}
      {view !== 'Agenda' && (
        <section className="rounded-xl border border-[#e9e2d7] bg-white p-3 shadow-sm">

          {/* Header nama hari */}
          <div className="mb-3 grid grid-cols-7 overflow-hidden rounded-lg border border-[#e5ddd1] bg-[#f5f0e7]">
            {weekdayNames.map((day, index) => (
              <div
                key={day}
                className={`border-r border-[#e5ddd1] py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wide last:border-r-0 ${
                  index === 6 ? 'bg-[#fcebea] text-[#ba1a1a]' : 'text-[#514b43]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-x-1 gap-y-2">
            {visibleDays.map((day) => {
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
                    ? 'text-[#3976b9]'
                    : day.date.getDay() === 0
                      ? 'text-[#ba1a1a]'
                      : ''

              return (
                <button
                  key={day.key}
                  onClick={() => selectDay(day.key)}
                  aria-label={`${formatLongDate(day.date)}${
                    nationalEvents.length
                      ? `, ${nationalEvents.map((event) => event.name).join(', ')}`
                      : ''
                  }`}
                  className={`flex min-h-[54px] flex-col items-center justify-center rounded-lg py-1 transition ${
                    active
                      ? 'border border-[#252525] bg-[#ffe69a] font-bold shadow-[2px_2px_0_#252525]'
                      : day.today
                        ? 'border border-[#d9ccff] bg-[#f5f0ff]'
                        : 'border border-transparent hover:bg-[#f5f0e7]'
                  } ${
                    !day.currentMonth && view === 'Bulan'
                      ? 'opacity-30'
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
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3976b9]" />
                    )}

                    {items.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Legenda */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#eee8df] pt-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ba1a1a]" />
              <span className="text-[9px] text-[#77716a]">
                Libur nasional
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#d97706]" />
              <span className="text-[9px] text-[#77716a]">
                Cuti bersama
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3976b9]" />
              <span className="text-[9px] text-[#77716a]">
                Hari peringatan
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#b19ae9]" />
              <span className="text-[9px] text-[#77716a]">
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
            <p className="rounded-xl bg-white p-5 text-center text-xs text-[#77716a]">
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
                  className="w-full rounded-xl bg-white p-4 text-left shadow-sm transition hover:bg-[#fffaf1]"
                >
                  <p className="text-xs font-bold">
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
                          <span className="text-[10px] font-semibold text-[#4f493f]">
                            {event.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {items.length > 0 && (
                    <p className="mt-2 text-[10px] text-[#77716a]">
                      {items.length} aktivitas
                    </p>
                  )}
                </button>
              )
            })
          )}
        </section>
      )}

      {/* Detail agenda tanggal terpilih */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">
              {formatLongDate(selected)}
            </h2>
            <p className="mt-1 text-[10px] text-[#77716a]">
              {selectedAgenda.length} komitmen produktivitas
            </p>
          </div>

          <span className="rounded-full bg-[#d9ccff] px-3 py-1 text-[10px] font-bold">
            {selectedAgenda.filter((item) => !item.done).length} Sisa
          </span>
        </div>

        <NationalEventList date={selected} />

        {selectedAgenda.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d8d0c4] bg-white px-4 py-9 text-center">
            <CalendarDays size={28} className="mx-auto text-[#aaa197]" />
            <p className="mt-3 text-sm font-bold">
              Belum ada jadwal
            </p>
            <p className="mt-1 text-xs text-[#77716a]">
              Hari ini masih bisa kamu isi dengan hal produktif.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedAgenda
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl bg-white p-3.5 shadow-sm ${
                    item.done ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleAgendaItem(item.id)}
                      aria-label="Ubah status aktivitas"
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#252525] ${
                        item.done ? 'bg-[#bdeccf]' : 'bg-[#f1ede6]'
                      }`}
                    >
                      {item.done && <Check size={13} />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-xs font-bold ${
                            item.done ? 'line-through text-[#77716a]' : ''
                          }`}
                        >
                          {item.title}
                        </h3>

                        <span
                          className="shrink-0 rounded px-2 py-1 text-[9px] font-bold"
                          style={{ backgroundColor: `${item.color}66` }}
                        >
                          {item.done ? 'Selesai' : 'Aktif'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#77716a]">
                        <Clock3 size={12} />
                        {item.time} WIB
                        <span>•</span>
                        {item.category}
                      </div>
                    </div>
                  </div>

                  {/* Tombol edit dan hapus */}
                  <div className="mt-3 flex justify-end gap-2 border-t border-[#f0ebe3] pt-2">
                    <button
                      onClick={() => openEditForm(item)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#f1ede6] px-3 py-2 text-[10px] font-bold text-[#4f493f] transition hover:bg-[#e9e2d7]"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        setDeleteTarget({
                          id: item.id,
                          date: selectedDate,
                          title: item.title,
                        })
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 size={12} />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Progress aktivitas */}
        <div className="rounded-xl bg-[#f1ede6] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">
              Aktivitas terselesaikan
            </span>
            <span className="text-xs font-bold">
              {selectedAgenda.filter((item) => item.done).length}/{selectedAgenda.length}
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[#bdeccf] transition-all"
              style={{
                width: selectedAgenda.length
                  ? `${
                      (selectedAgenda.filter((item) => item.done).length /
                        selectedAgenda.length) *
                      100
                    }%`
                  : '0%',
              }}
            />
          </div>
        </div>
      </section>

      {/* Tombol tambah jadwal */}
      <button
        onClick={openAddForm}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#252525] bg-[#252525] px-4 py-3 text-xs font-bold text-white shadow-[3px_3px_0_#d9ccff] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        <Plus size={17} />
        Tambah Jadwal
      </button>

      {/* Modal tambah dan edit jadwal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeForm()
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#e8e0d4] bg-[#fffaf1] p-5 shadow-2xl">
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
                onClick={closeForm}
                aria-label="Tutup formulir"
                className="rounded-lg bg-[#f1ede6] p-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold">
                  Nama kegiatan
                </label>
                <input
                  autoFocus
                  type="text"
                  value={formTitle}
                  onChange={(event) => {
                    setFormTitle(event.target.value)
                    setFormError('')
                  }}
                  placeholder="Contoh: Mengerjakan tugas kuliah"
                  className="w-full rounded-xl border border-[#ddd4c7] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#252525]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(event) => setFormDate(event.target.value)}
                  className="w-full rounded-xl border border-[#ddd4c7] bg-white px-3 py-3 text-sm outline-none focus:border-[#252525]"
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
                  className="w-full rounded-xl border border-[#ddd4c7] bg-white px-3 py-3 text-sm outline-none focus:border-[#252525]"
                />
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
                      className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition ${
                        formCategory === category.name
                          ? 'border-[#252525] bg-[#ffe69a]'
                          : 'border-[#e5ddd1] bg-white'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
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
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-[#ddd4c7] bg-white px-4 py-3 text-xs font-bold"
                >
                  Batal
                </button>

                <button
                  onClick={saveSchedule}
                  className="flex-1 rounded-xl border-2 border-[#252525] bg-[#252525] px-4 py-3 text-xs font-bold text-white shadow-[2px_2px_0_#d9ccff]"
                >
                  {editingAgenda ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-sm rounded-2xl border border-[#e8e0d4] bg-[#fffaf1] p-5 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
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
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-[#ddd4c7] bg-white px-4 py-3 text-xs font-bold"
              >
                Batal
              </button>

              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl border-2 border-red-600 bg-red-600 px-4 py-3 text-xs font-bold text-white"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
