import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react'

import { useAppData } from '../../hooks/AppContext'
import type { Task } from '../../types/app'

interface TaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

const categories = [
  'Kuliah',
  'Pribadi',
  'Rutinitas',
  'Kesehatan',
  'Kajian',
]

const priorityOptions: {
  value: Task['priority']
  label: string
  badgeClass: string
}[] = [
  {
    value: 'Tinggi',
    label: 'Tinggi',
    badgeClass: 'bg-[#ffd6d6] text-[#8a1f1f]',
  },
  {
    value: 'Sedang',
    label: 'Sedang',
    badgeClass: 'bg-[#ffe69a] text-[#252525]',
  },
  {
    value: 'Rendah',
    label: 'Rendah',
    badgeClass: 'bg-[#dcebd5] text-[#2f5228]',
  },
]

const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const hourOptions = Array.from({ length: 24 }, (_, idx) =>
  String(idx).padStart(2, '0'),
)

const minuteOptions = [
  '00',
  '05',
  '10',
  '15',
  '20',
  '25',
  '30',
  '35',
  '40',
  '45',
  '50',
  '55',
]

const quickTimePresets = ['07:00', '10:00', '13:00', '16:00', '20:00']

function getDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function parseDateString(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function formatReadableDate(dateStr: string) {
  const date = parseDateString(dateStr)
  return `${date.getDate()} ${monthNames[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`
}

type ActivePicker = 'category' | 'priority' | 'date' | 'time' | null

export default function TaskFormModal({
  isOpen,
  onClose,
  onSaved,
}: TaskFormModalProps) {
  const { data, addTask } = useAppData()

  const profileName = data.profile.name.trim() || 'teman'
  const todayString = getDateString(new Date())

  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Kuliah')
  const [newPriority, setNewPriority] =
    useState<Task['priority']>('Sedang')
  const [newDate, setNewDate] = useState(todayString)
  const [newTime, setNewTime] = useState('20:00')

  const [activePicker, setActivePicker] = useState<ActivePicker>(null)
  const [pickerMonth, setPickerMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    if (!isOpen) return

    const now = new Date()
    setNewTitle('')
    setNewCategory('Kuliah')
    setNewPriority('Sedang')
    setNewDate(getDateString(now))
    setNewTime('20:00')
    setActivePicker(null)
    setPickerMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }, [isOpen])

  if (!isOpen) return null

  const togglePicker = (picker: ActivePicker) => {
    if (picker === 'date') {
      const selected = parseDateString(newDate)
      setPickerMonth(
        new Date(selected.getFullYear(), selected.getMonth(), 1),
      )
    }
    setActivePicker((prev) => (prev === picker ? null : picker))
  }

  function saveTask() {
    if (!newTitle.trim()) return

    const newTask: Task = {
      id: Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      date: newDate,
      time: newTime,
      status: 'todo',
    }

    addTask(newTask)
    onClose()
    onSaved?.()
  }

  // Bangun grid kalender untuk custom date picker
  const year = pickerMonth.getFullYear()
  const month = pickerMonth.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const startOffset = (firstDayOfMonth + 6) % 7 // Senin = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarCells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const [selectedHour, selectedMinute] = newTime.split(':')
  const currentPriorityMeta =
    priorityOptions.find((p) => p.value === newPriority) ??
    priorityOptions[1]

  return createPortal(
    <div
      onClick={onClose}
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
          <h2 className="text-lg font-bold">
            Target Baru {profileName}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="rounded-full p-2 hover:bg-[#f0ece4]"
          >
            <X size={19} />
          </button>
        </div>

        {/* Judul Target */}
        <div className="space-y-2">
          <label className="text-xs font-semibold">
            Judul Target
          </label>

          <textarea
            autoFocus
            rows={1}
            enterKeyHint="done"
            value={newTitle}
            onChange={(event) =>
              setNewTitle(event.target.value.replace(/\r?\n/g, ''))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            placeholder="Misal: Review Bab 6..."
            className="w-full resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white px-3.5 py-3 text-sm text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
          />
        </div>

        {/* Baris 1: Kategori & Prioritas */}
        <div className="grid grid-cols-2 gap-3">
          {/* Custom Dropdown Kategori */}
          <div className="relative space-y-2">
            <label className="text-xs font-semibold">
              Kategori
            </label>

            <button
              type="button"
              onClick={() => togglePicker('category')}
              aria-expanded={activePicker === 'category'}
              className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-[#252525] bg-[#ffe69a] px-3 py-3 text-xs font-bold text-[#252525] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span>{newCategory}</span>
              <ChevronDown
                size={15}
                className={`transition-transform ${
                  activePicker === 'category' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {activePicker === 'category' && (
              <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border-2 border-[#252525] bg-[#fffaf1] p-1.5 shadow-[3px_3px_0_#252525]">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setNewCategory(category)
                      setActivePicker(null)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition ${
                      newCategory === category
                        ? 'bg-[#ffe69a] font-extrabold text-[#252525]'
                        : 'font-medium text-[#625d55] hover:bg-[#f5f0e7]'
                    }`}
                  >
                    {category}
                    {newCategory === category && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Dropdown Prioritas */}
          <div className="relative space-y-2">
            <label className="text-xs font-semibold">
              Prioritas
            </label>

            <button
              type="button"
              onClick={() => togglePicker('priority')}
              aria-expanded={activePicker === 'priority'}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 border-[#252525] px-3 py-3 text-xs font-bold shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${currentPriorityMeta.badgeClass}`}
            >
              <span>{currentPriorityMeta.label}</span>
              <ChevronDown
                size={15}
                className={`transition-transform ${
                  activePicker === 'priority' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {activePicker === 'priority' && (
              <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border-2 border-[#252525] bg-[#fffaf1] p-1.5 shadow-[3px_3px_0_#252525]">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setNewPriority(option.value)
                      setActivePicker(null)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition ${
                      newPriority === option.value
                        ? `${option.badgeClass} font-extrabold`
                        : 'font-medium text-[#625d55] hover:bg-[#f5f0e7]'
                    }`}
                  >
                    <span>{option.label}</span>
                    {newPriority === option.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Baris 2: Custom Tanggal & Custom Waktu */}
        <div className="grid grid-cols-2 gap-3">
          {/* Custom Date Trigger */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">
              Tanggal
            </label>

            <button
              type="button"
              onClick={() => togglePicker('date')}
              aria-expanded={activePicker === 'date'}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 border-[#252525] px-3 py-3 text-xs font-bold text-[#252525] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                activePicker === 'date' ? 'bg-[#ffe69a]' : 'bg-[#f5f0e7]'
              }`}
            >
              <span className="truncate">{formatReadableDate(newDate)}</span>
              <CalendarIcon size={15} className="shrink-0" />
            </button>
          </div>

          {/* Custom Time Trigger */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">
              Waktu
            </label>

            <button
              type="button"
              onClick={() => togglePicker('time')}
              aria-expanded={activePicker === 'time'}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 border-[#252525] px-3 py-3 text-xs font-bold text-[#252525] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                activePicker === 'time' ? 'bg-[#ffe69a]' : 'bg-[#f5f0e7]'
              }`}
            >
              <span>{newTime} WIB</span>
              <Clock size={15} className="shrink-0" />
            </button>
          </div>
        </div>

        {/* Panel Custom Date Picker */}
        {activePicker === 'date' && (
          <div className="rounded-xl border-2 border-[#252525] bg-white p-3.5 shadow-[3px_3px_0_#252525]">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setPickerMonth(new Date(year, month - 1, 1))
                }
                aria-label="Bulan sebelumnya"
                className="rounded-lg border border-[#252525] bg-[#f5f0e7] p-1.5 hover:bg-[#ffe69a]"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="text-xs font-extrabold text-[#252525]">
                {monthNames[month]} {year}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPickerMonth(new Date(year, month + 1, 1))
                }
                aria-label="Bulan berikutnya"
                className="rounded-lg border border-[#252525] bg-[#f5f0e7] p-1.5 hover:bg-[#ffe69a]"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-bold text-[#716b60]">
              {dayHeaders.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarCells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} />
                }

                const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isSelected = cellDateStr === newDate
                const isToday = cellDateStr === getDateString(new Date())

                return (
                  <button
                    key={cellDateStr}
                    type="button"
                    onClick={() => {
                      setNewDate(cellDateStr)
                      setActivePicker(null)
                    }}
                    className={`rounded-lg py-1.5 text-xs font-bold transition ${
                      isSelected
                        ? 'border border-[#252525] bg-[#ffe69a] text-[#252525] shadow-[1.5px_1.5px_0_#252525]'
                        : isToday
                          ? 'bg-[#eee8d9] text-[#252525]'
                          : 'text-[#4e4941] hover:bg-[#f5f0e7]'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#eee8d9] pt-2.5">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date()
                    setNewDate(getDateString(today))
                    setActivePicker(null)
                  }}
                  className="rounded-lg border border-[#252525] bg-[#ffe69a] px-2.5 py-1 text-[11px] font-bold"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    setNewDate(getDateString(tomorrow))
                    setActivePicker(null)
                  }}
                  className="rounded-lg border border-[#d9cfbd] bg-[#f5f0e7] px-2.5 py-1 text-[11px] font-semibold"
                >
                  Besok
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="text-[11px] font-bold text-[#716b60] hover:text-[#252525]"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Panel Custom Time Picker */}
        {activePicker === 'time' && (
          <div className="space-y-3 rounded-xl border-2 border-[#252525] bg-white p-3.5 shadow-[3px_3px_0_#252525]">
            <div className="flex flex-wrap gap-1.5">
              {quickTimePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setNewTime(preset)
                    setActivePicker(null)
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                    newTime === preset
                      ? 'border-[#252525] bg-[#ffe69a] text-[#252525]'
                      : 'border-[#d9cfbd] bg-[#f5f0e7] text-[#5e584f] hover:bg-[#eee8d9]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <p className="mb-1 text-[11px] font-bold text-[#716b60]">
                  Jam
                </p>
                <div className="grid max-h-32 grid-cols-4 gap-1 overflow-y-auto rounded-lg border border-[#e5ddcf] bg-[#fffaf1] p-1.5">
                  {hourOptions.map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() =>
                        setNewTime(`${hr}:${selectedMinute || '00'}`)
                      }
                      className={`rounded py-1 text-xs font-bold ${
                        selectedHour === hr
                          ? 'bg-[#252525] text-white'
                          : 'text-[#4e4941] hover:bg-[#eee8d9]'
                      }`}
                    >
                      {hr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-bold text-[#716b60]">
                  Menit
                </p>
                <div className="grid max-h-32 grid-cols-3 gap-1 overflow-y-auto rounded-lg border border-[#e5ddcf] bg-[#fffaf1] p-1.5">
                  {minuteOptions.map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => {
                        setNewTime(`${selectedHour || '20'}:${min}`)
                        setActivePicker(null)
                      }}
                      className={`rounded py-1 text-xs font-bold ${
                        selectedMinute === min
                          ? 'bg-[#252525] text-white'
                          : 'text-[#4e4941] hover:bg-[#eee8d9]'
                      }`}
                    >
                      {min}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="rounded-lg border border-[#252525] bg-[#ffe69a] px-3 py-1 text-[11px] font-bold"
              >
                Selesai ({newTime})
              </button>
            </div>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-xs font-semibold text-[#77716a] hover:bg-[#f0ece4]"
          >
            Batal
          </button>

          <button
            type="button"
            data-sound="success"
            onClick={saveTask}
            disabled={!newTitle.trim()}
            className="rounded-xl border-2 border-[#252525] bg-[#252525] px-5 py-3 text-xs font-bold text-white shadow-[3px_3px_0_#fae195] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            Simpan Target
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}