
import { useEffect, useState } from 'react'
import {
  Check,
  ChevronDown,
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

function getDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

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
  const [showCategoryOptions, setShowCategoryOptions] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setNewTitle('')
    setNewCategory('Kuliah')
    setNewPriority('Sedang')
    setNewDate(getDateString(new Date()))
    setNewTime('20:00')
    setShowCategoryOptions(false)
  }, [isOpen])

  if (!isOpen) return null

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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#252525]/40 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[480px] space-y-4 overflow-y-auto rounded-t-2xl bg-[#fffaf1] p-5 pb-8 shadow-2xl"
      >
        <div className="mx-auto h-1 w-12 rounded-full bg-[#d8d0c4]" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Target Baru {profileName}
          </h2>

          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="rounded-full p-2 hover:bg-[#f0ece4]"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold">
            Judul Target
          </label>

          <input
            autoFocus
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Misal: Review Bab 6..."
            className="w-full rounded-lg bg-[#f5f0e7] px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-[#252525]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative space-y-2">
            <label className="text-xs font-semibold">
              Kategori
            </label>

            <button
              type="button"
              onClick={() => setShowCategoryOptions(!showCategoryOptions)}
              aria-expanded={showCategoryOptions}
              className="flex w-full items-center justify-between gap-2 rounded-lg border-2 border-[#252525] bg-[#ffe69a] px-3 py-3 text-xs font-bold text-[#252525] shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span>{newCategory}</span>
              <ChevronDown
                size={15}
                className={`transition-transform ${
                  showCategoryOptions ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showCategoryOptions && (
              <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border-2 border-[#252525] bg-[#fffaf1] p-1.5 shadow-[3px_3px_0_#252525]">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setNewCategory(category)
                      setShowCategoryOptions(false)
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

          <div className="space-y-2">
            <label className="text-xs font-semibold">
              Prioritas
            </label>

            <select
              value={newPriority}
              onChange={(event) =>
                setNewPriority(event.target.value as Task['priority'])
              }
              className="w-full rounded-lg border-2 border-[#252525] bg-[#f5f0e7] px-3 py-3 text-xs font-semibold outline-none shadow-[2px_2px_0_#252525] focus:bg-[#ffe69a]"
            >
              <option value="Tinggi">Tinggi</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold">
              Tanggal
            </label>

            <input
              type="date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
              className="w-full min-w-0 rounded-lg border-2 border-[#252525] bg-[#f5f0e7] px-2 py-3 text-xs outline-none shadow-[2px_2px_0_#252525] focus:bg-[#ffe69a]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">
              Waktu
            </label>

            <input
              type="time"
              value={newTime}
              onChange={(event) => setNewTime(event.target.value)}
              className="w-full rounded-lg border-2 border-[#252525] bg-[#f5f0e7] px-3 py-3 text-xs outline-none shadow-[2px_2px_0_#252525] focus:bg-[#ffe69a]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-3 text-xs font-semibold text-[#77716a]"
          >
            Batal
          </button>

          <button
            onClick={saveTask}
            disabled={!newTitle.trim()}
            className="rounded-lg border border-[#252525] bg-[#252525] px-5 py-3 text-xs font-bold text-white shadow-[2px_2px_0_#fae195] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Simpan Target
          </button>
        </div>
      </div>
    </div>
  )
}
