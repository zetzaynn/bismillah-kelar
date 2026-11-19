
import { useMemo, useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  Plus,
  Check,
  X,
  Clock3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { useAppData } from '../hooks/AppContext'
import type { Task } from '../types/app'

type FilterType = 'Semua' | 'Hari Ini' | 'Mendatang' | 'Selesai'

function getDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatDate(date: string) {
  const todayString = getDateString(new Date())

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowString = getDateString(tomorrow)

  if (date === todayString) return 'Hari ini'
  if (date === tomorrowString) return 'Besok'

  return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

const filters: FilterType[] = [
  'Semua',
  'Hari Ini',
  'Mendatang',
  'Selesai',
]

const priorityStyle = {
  Tinggi: 'bg-[#ffdad6] text-[#93000a]',
  Sedang: 'bg-[#fae195] text-[#554507]',
  Rendah: 'bg-[#ece8e0] text-[#55514b]',
}

const categoryStyle: Record<string, string> = {
  Kuliah: 'bg-[#e7deff] text-[#4a406b]',
  Pribadi: 'bg-[#d7cafd] text-[#4a406b]',
  Rutinitas: 'bg-[#ece8e0] text-[#55514b]',
  Kesehatan: 'bg-[#bdeccf] text-[#24543a]',
  Kajian: 'bg-[#ffe6cf] text-[#79502b]',
}

export default function Tasks() {
  const { data, addTask, updateTask } = useAppData()
  const tasks = data.tasks

  const todayString = getDateString(new Date())

  const [activeFilter, setActiveFilter] = useState<FilterType>('Hari Ini')
  const [search, setSearch] = useState('')
  const [showCompleted, setShowCompleted] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [sortBy, setSortBy] = useState<'Tanggal' | 'Prioritas'>('Tanggal')

  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Kuliah')
  const [newPriority, setNewPriority] =
    useState<Task['priority']>('Sedang')
  const [newDate, setNewDate] = useState(todayString)
  const [newTime, setNewTime] = useState('20:00')

  // Ringkasan tugas
  const total = tasks.length

  const completed = tasks.filter(
    (task) => task.status === 'done',
  ).length

  const overdue = tasks.filter(
    (task) => task.status === 'todo' && task.date < todayString,
  ).length

  const inProgress = tasks.filter(
    (task) => task.status === 'todo' && task.date >= todayString,
  ).length

  // Pencarian, filter, dan pengurutan
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) =>
      task.title.toLowerCase().includes(search.toLowerCase()),
    )

    if (activeFilter === 'Hari Ini') {
      result = result.filter(
        (task) => task.date === todayString && task.status === 'todo',
      )
    } else if (activeFilter === 'Mendatang') {
      result = result.filter(
        (task) => task.date > todayString && task.status === 'todo',
      )
    } else if (activeFilter === 'Selesai') {
      result = result.filter((task) => task.status === 'done')
    }

    if (sortBy === 'Tanggal') {
      result.sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
      )
    } else {
      const priorityOrder = {
        Tinggi: 0,
        Sedang: 1,
        Rendah: 2,
      }

      result.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      )
    }

    return result
  }, [tasks, activeFilter, search, sortBy, todayString])

  const todayTasks = filteredTasks.filter(
    (task) => task.date === todayString && task.status === 'todo',
  )

  const upcomingTasks = filteredTasks.filter(
    (task) => task.date > todayString && task.status === 'todo',
  )

  const completedTasks = filteredTasks.filter(
    (task) => task.status === 'done',
  )

  // Mengubah status tugas
  function toggleTask(id: number) {
    const task = tasks.find((item) => item.id === id)

    if (!task) return

    updateTask(id, {
      status: task.status === 'done' ? 'todo' : 'done',
    })
  }

  // Menyimpan tugas baru ke AppContext
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

    setNewTitle('')
    setNewCategory('Kuliah')
    setNewPriority('Sedang')
    setNewDate(todayString)
    setNewTime('20:00')
    setShowModal(false)
    setActiveFilter('Semua')
  }

  // Komponen baris tugas
  function TaskRow({ task }: { task: Task }) {
    const done = task.status === 'done'

    return (
      <div
        className={`group flex items-start gap-3 rounded-lg px-2 py-4 transition hover:bg-white/70 ${
          done ? 'opacity-60' : ''
        }`}
      >
        <button
          onClick={() => toggleTask(task.id)}
          aria-label={done ? 'Batalkan tugas selesai' : 'Tandai selesai'}
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#252525] transition active:scale-95 ${
            done
              ? 'bg-[#d7cafd]'
              : 'bg-white shadow-[1.5px_1.5px_0_#252525]'
          }`}
        >
          {done && <Check size={16} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-1 text-[10px] font-semibold ${
                categoryStyle[task.category] ?? 'bg-[#ece8e0]'
              }`}
            >
              {task.category}
            </span>

            {!done && (
              <span
                className={`rounded px-2 py-1 text-[10px] font-bold ${
                  priorityStyle[task.priority]
                }`}
              >
                {task.priority}
              </span>
            )}
          </div>

          <p
            className={`text-sm font-semibold leading-snug ${
              done ? 'text-[#747878] line-through' : ''
            }`}
          >
            {task.title}
          </p>

          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#77716a]">
            <Clock3 size={13} />
            <span>
              {done ? 'Selesai' : formatDate(task.date)}, {task.time} WIB
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Komponen kelompok tugas
  function Section({
    title,
    items,
  }: {
    title: string
    items: Task[]
  }) {
    if (items.length === 0) return null

    return (
      <section className="mb-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>

          <span className="text-[10px] text-[#77716a]">
            {items.length} tugas
          </span>
        </div>

        <div className="divide-y divide-[#e9e1d5]">
          {items.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="relative space-y-5 pb-24">

      {/* Header halaman */}
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tugas</h1>
          <p className="mt-1 text-xs text-[#77716a]">
            Manajemen target & produktivitas mandiri Zayy
          </p>
        </div>

        <span className="rounded-full bg-[#d9ccff] px-3 py-1.5 text-[10px] font-bold text-[#4a406b]">
          ● Fokus Zayy
        </span>
      </section>

      {/* Pencarian dan sortir */}
      <section className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#77716a]"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari tugas pribadi..."
            className="w-full rounded-lg border border-[#eee8df] bg-white py-3 pl-10 pr-3 text-xs outline-none focus:border-[#252525]"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            aria-label="Filter dan urutkan"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#eee8df] bg-white"
          >
            <SlidersHorizontal size={18} />
          </button>

          {showSort && (
            <div className="absolute right-0 top-12 z-20 w-40 rounded-xl border border-[#e9e1d5] bg-white p-2 shadow-lg">
              <p className="px-2 py-1 text-[10px] font-bold text-[#77716a]">
                URUTKAN BERDASARKAN
              </p>

              {(['Tanggal', 'Prioritas'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setSortBy(item)
                    setShowSort(false)
                  }}
                  className={`w-full rounded-lg px-2 py-2 text-left text-xs ${
                    sortBy === item
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
      </section>

      {/* Ringkasan tugas */}
      <section className="flex items-center justify-between gap-1 rounded-xl bg-[#f5f0e7] px-3 py-4">
        {[
          { label: 'Total', value: total, color: 'text-[#252525]' },
          { label: 'Kelar', value: completed, color: 'text-[#625884]' },
          { label: 'Berjalan', value: inProgress, color: 'text-[#6e5d1f]' },
          { label: 'Terlewat', value: overdue, color: 'text-[#ba1a1a]' },
        ].map((item, index) => (
          <div
            key={item.label}
            className="flex flex-1 items-center justify-center"
          >
            <div className="flex flex-col items-center">
              <span className={`text-xl font-bold ${item.color}`}>
                {item.value}
              </span>

              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#77716a]">
                {item.label}
              </span>
            </div>

            {index !== 3 && (
              <div className="ml-auto h-7 w-px bg-[#e6e2da]" />
            )}
          </div>
        ))}
      </section>

      {/* Filter status */}
      <section className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => {
          const count =
            filter === 'Semua'
              ? total
              : filter === 'Hari Ini'
                ? tasks.filter(
                    (task) =>
                      task.date === todayString && task.status === 'todo',
                  ).length
                : filter === 'Mendatang'
                  ? tasks.filter(
                      (task) =>
                        task.date > todayString && task.status === 'todo',
                    ).length
                  : completed

          const active = activeFilter === filter

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                active
                  ? 'border border-[#252525] bg-[#ffe69a] text-[#252525] shadow-[2px_2px_0_#252525]'
                  : 'border border-transparent bg-white text-[#77716a]'
              }`}
            >
              {filter}
              <span className="ml-1 text-[10px]">{count}</span>
            </button>
          )
        })}
      </section>

      {/* Daftar tugas */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d8d0c4] px-4 py-12 text-center">
          <CalendarDays size={30} className="mx-auto text-[#aaa197]" />

          <h3 className="mt-3 text-sm font-bold">Belum ada tugas</h3>

          <p className="mt-1 text-xs text-[#77716a]">
            Coba ubah filter atau tambahkan tugas baru.
          </p>
        </div>
      ) : (
        <>
          <Section title="Prioritas Hari Ini" items={todayTasks} />

          <Section title="Mendatang & Studi" items={upcomingTasks} />

          {completedTasks.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#77716a]">
                    Telah Diselesaikan
                  </h2>

                  <span className="rounded-full bg-[#ece8e0] px-2 py-1 text-[10px]">
                    {completedTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#77716a]"
                >
                  {showCompleted ? 'Sembunyikan' : 'Tampilkan'}

                  {showCompleted ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
              </div>

              {showCompleted && (
                <div className="divide-y divide-[#e9e1d5]">
                  {completedTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Tombol tambah tugas */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full border-2 border-[#252525] bg-[#d9ccff] px-5 py-3 text-xs font-bold shadow-[3px_3px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        <Plus size={18} />
        Tambah Tugas
      </button>

      {/* Modal tambah tugas */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[#252525]/40 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-[480px] space-y-4 overflow-y-auto rounded-t-2xl bg-[#fffaf1] p-5 pb-8 shadow-2xl"
          >
            <div className="mx-auto h-1 w-12 rounded-full bg-[#d8d0c4]" />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Tugas Baru Zayy</h2>

              <button
                onClick={() => setShowModal(false)}
                aria-label="Tutup modal"
                className="rounded-full p-2 hover:bg-[#f0ece4]"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Judul Tugas</label>

              <input
                autoFocus
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Misal: Review Bab 6..."
                className="w-full rounded-lg bg-[#f5f0e7] px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-[#252525]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold">Kategori</label>

                <select
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  className="w-full rounded-lg bg-[#f5f0e7] px-3 py-3 text-xs outline-none"
                >
                  <option>Kuliah</option>
                  <option>Pribadi</option>
                  <option>Rutinitas</option>
                  <option>Kesehatan</option>
                  <option>Kajian</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Prioritas</label>

                <select
                  value={newPriority}
                  onChange={(event) =>
                    setNewPriority(event.target.value as Task['priority'])
                  }
                  className="w-full rounded-lg bg-[#f5f0e7] px-3 py-3 text-xs outline-none"
                >
                  <option>Tinggi</option>
                  <option>Sedang</option>
                  <option>Rendah</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold">Tanggal</label>

                <input
                  type="date"
                  value={newDate}
                  onChange={(event) => setNewDate(event.target.value)}
                  className="w-full min-w-0 rounded-lg bg-[#f5f0e7] px-2 py-3 text-xs outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Waktu</label>

                <input
                  type="time"
                  value={newTime}
                  onChange={(event) => setNewTime(event.target.value)}
                  className="w-full rounded-lg bg-[#f5f0e7] px-3 py-3 text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-3 text-xs font-semibold text-[#77716a]"
              >
                Batal
              </button>

              <button
                onClick={saveTask}
                disabled={!newTitle.trim()}
                className="rounded-lg border border-[#252525] bg-[#252525] px-5 py-3 text-xs font-bold text-white shadow-[2px_2px_0_#fae195] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Simpan Tugas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
