import { useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Search,
  SlidersHorizontal,
  Check,
  Clock3,
  CalendarDays,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

import { useAppData } from '../hooks/AppContext'
import { playInteractionSound } from '../lib/interactionSound'
import type { Task, TaskPriority } from '../types/app'

type FilterType = 'Semua' | 'Hari Ini' | 'Selesai' | 'Terlewat' | 'Mendatang'

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
  'Selesai',
  'Terlewat',
  'Mendatang',
]

const categoryOptions = [
  'Kuliah',
  'Pribadi',
  'Rutinitas',
  'Kesehatan',
  'Kajian',
]

const priorityOptions: TaskPriority[] = ['Tinggi', 'Sedang', 'Rendah']

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
  const { data, updateTask, deleteTask } = useAppData()
  const tasks = data.tasks

  const todayString = getDateString(new Date())

  const [activeFilter, setActiveFilter] = useState<FilterType>('Hari Ini')
  const [search, setSearch] = useState('')
  const [showSort, setShowSort] = useState(false)
  const [sortBy, setSortBy] = useState<'Tanggal' | 'Prioritas'>('Tanggal')

  // State CRUD Edit & Hapus
  const [taskActionMode, setTaskActionMode] = useState<
    'normal' | 'edit' | 'delete'
  >('normal')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('Pribadi')
  const [editPriority, setEditPriority] = useState<TaskPriority>('Sedang')
  const [editDate, setEditDate] = useState(todayString)
  const [editTime, setEditTime] = useState('09:00')

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

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) =>
      task.title.toLowerCase().includes(search.toLowerCase()),
    )

    if (activeFilter === 'Hari Ini') {
      result = result.filter(
        (task) => task.date === todayString && task.status === 'todo',
      )
    } else if (activeFilter === 'Selesai') {
      result = result.filter((task) => task.status === 'done')
    } else if (activeFilter === 'Terlewat') {
      result = result.filter(
        (task) => task.date < todayString && task.status === 'todo',
      )
    } else if (activeFilter === 'Mendatang') {
      result = result.filter(
        (task) => task.date > todayString && task.status === 'todo',
      )
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

  const overdueTasks = filteredTasks.filter(
    (task) => task.date < todayString && task.status === 'todo',
  )

  const completedTasks = filteredTasks.filter(
    (task) => task.status === 'done',
  )

  function openEditTaskModal(task: Task) {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditCategory(task.category)
    setEditPriority(task.priority)
    setEditDate(task.date)
    setEditTime(task.time)
    setTaskActionMode('normal')
  }

  function handleSaveEditedTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingTask) return

    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) return

    updateTask(editingTask.id, {
      title: trimmedTitle,
      category: editCategory,
      priority: editPriority,
      date: editDate || todayString,
      time: editTime || '09:00',
    })

    playInteractionSound('success')
    setEditingTask(null)
  }

  function handleTaskInteraction(task: Task) {
    if (taskActionMode === 'edit') {
      openEditTaskModal(task)
      return
    }

    if (taskActionMode === 'delete') {
      setTaskActionMode('normal')
      setDeleteTarget(task)
      return
    }

    updateTask(task.id, {
      status: task.status === 'done' ? 'todo' : 'done',
    })
  }

  function confirmDeleteTarget() {
    if (!deleteTarget) return

    deleteTask(deleteTarget.id)
    playInteractionSound('success')
    setDeleteTarget(null)
  }

  function TaskActionButtons() {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setTaskActionMode((current) =>
              current === 'edit' ? 'normal' : 'edit',
            )
          }
          aria-label="Edit target"
          aria-pressed={taskActionMode === 'edit'}
          title="Edit target"
          className={`flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-[#252525] text-[#252525] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
            taskActionMode === 'edit'
              ? 'translate-x-[2px] translate-y-[2px] bg-[#f7d874] shadow-none'
              : 'bg-[#ffe69a] shadow-[2px_2px_0_#252525]'
          }`}
        >
          <Pencil size={17} />
        </button>

        <button
          type="button"
          onClick={() =>
            setTaskActionMode((current) =>
              current === 'delete' ? 'normal' : 'delete',
            )
          }
          aria-label="Hapus target"
          aria-pressed={taskActionMode === 'delete'}
          title="Hapus target"
          className={`flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-[#252525] text-[#252525] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
            taskActionMode === 'delete'
              ? 'translate-x-[2px] translate-y-[2px] bg-[#ff9e8d] shadow-none'
              : 'bg-[#ffb5a7] shadow-[2px_2px_0_#252525]'
          }`}
        >
          <Trash2 size={17} />
        </button>
      </div>
    )
  }

  function TaskRow({ task }: { task: Task }) {
    const done = task.status === 'done'
    const isOverdue = !done && task.date < todayString

    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={done}
        data-sound={taskActionMode === 'normal' ? 'check' : 'click'}
        onClick={() => handleTaskInteraction(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleTaskInteraction(task)
          }
        }}
        className={`group flex cursor-pointer select-none items-center gap-2.5 rounded-xl border-2 border-[#252525] px-3 py-2.5 shadow-[3px_3px_0_#252525] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
          taskActionMode === 'edit'
            ? 'bg-[#fff3c4]'
            : taskActionMode === 'delete'
              ? 'bg-[#ffe0d9]'
              : done
                ? 'bg-[#CDE8D3]'
                : isOverdue
                  ? 'bg-[#FFE6E1]'
                  : 'bg-white'
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[#252525] transition ${
            taskActionMode === 'edit'
              ? 'bg-[#ffe69a] text-[#252525]'
              : taskActionMode === 'delete'
                ? 'bg-[#ffb5a7] text-[#252525]'
                : done
                  ? 'bg-[#252525] text-white'
                  : 'bg-white shadow-[1.5px_1.5px_0_#252525]'
          }`}
        >
          {taskActionMode === 'edit' ? (
            <Pencil size={12} strokeWidth={2.5} />
          ) : taskActionMode === 'delete' ? (
            <Trash2 size={12} strokeWidth={2.5} />
          ) : (
            done && <Check size={14} strokeWidth={2.8} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-md border border-[#252525]/20 px-1.5 py-0.5 text-[9.5px] font-bold leading-none ${
                done
                  ? 'bg-white/75 text-[#4a5d4e]'
                  : (categoryStyle[task.category] ?? 'bg-[#ece8e0]')
              }`}
            >
              {task.category}
            </span>

            {!done && (
              <span
                className={`rounded-md border border-[#252525]/20 px-1.5 py-0.5 text-[9.5px] font-extrabold leading-none ${
                  priorityStyle[task.priority]
                }`}
              >
                {task.priority}
              </span>
            )}

            {isOverdue && (
              <span className="rounded-md border border-[#252525] bg-[#FFB5A7] px-1.5 py-0.5 text-[9.5px] font-extrabold leading-none text-[#252525]">
                Terlewat
              </span>
            )}

            <span
              className={`ml-auto flex items-center gap-1 text-[10px] font-semibold ${
                done
                  ? 'text-[#4a5d4e]'
                  : isOverdue
                    ? 'text-[#5f160c]'
                    : 'text-[#77716a]'
              }`}
            >
              <Clock3 size={11} />
              <span>
                {done ? 'Selesai' : formatDate(task.date)}, {task.time} WIB
              </span>
            </span>
          </div>

          <p
            className={`mt-1 text-sm font-bold leading-snug ${
              done ? 'text-[#252525]/75 line-through' : 'text-[#252525]'
            }`}
          >
            {task.title}
          </p>
        </div>
      </div>
    )
  }

  function TodaySection({ showEmptyState }: { showEmptyState: boolean }) {
    if (!showEmptyState && todayTasks.length === 0) return null

    return (
      <section className="mb-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="pt-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#7c2d12]">
                Target Hari Ini
              </h2>
              <span className="rounded-full border border-[#252525]/20 bg-[#FB923C] px-2.5 py-0.5 text-[11px] font-extrabold text-[#252525]">
                {todayTasks.length}
              </span>
            </div>

            <span className="mt-1 block text-xs font-medium text-[#77716a]">
              Output dari Tambah Target
            </span>
          </div>

          <TaskActionButtons />
        </div>

        {todayTasks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#c7beb0] bg-white px-4 py-10 text-center">
            <CalendarDays size={28} className="mx-auto text-[#aaa197]" />

            <h3 className="mt-2.5 text-sm font-bold">
              Belum ada target hari ini
            </h3>

            <p className="mt-1 text-xs text-[#77716a]">
              Tekan tombol + Tambah Target di bawah untuk menambahkan target baru.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="relative space-y-4 pb-24 pr-[3px]">
      {/* 1. Judul Target + Keterangan */}
      <section>
        <h1 className="text-[25px] font-bold leading-tight tracking-tight">
          Target
        </h1>
        <p className="mt-1 text-sm text-[#77716a]">
          Manajemen tugas dan produktivitas mandiri
        </p>
      </section>

      {/* 2. Search satu baris bersebelahan dengan Urutkan */}
      <section className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77716a]"
          />

          <textarea
            rows={1}
            enterKeyHint="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value.replace(/\r?\n/g, ''))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            placeholder="Cari target pribadi..."
            className="block w-full resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white py-2.5 pl-9 pr-8 text-sm text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#77716a] hover:bg-[#f0ece4] hover:text-[#252525]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowSort(!showSort)}
            aria-label="Urutkan target"
            aria-expanded={showSort}
            className="flex h-[44px] items-center gap-1.5 rounded-xl border-2 border-[#252525] bg-white px-3 text-xs font-extrabold shadow-[2px_2px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <SlidersHorizontal size={15} />
            <span>{sortBy}</span>
          </button>

          {showSort && (
            <div className="absolute right-0 top-12 z-20 w-44 rounded-xl border-2 border-[#252525] bg-white p-2 shadow-[4px_4px_0_#252525]">
              <p className="px-2 py-1 text-[10px] font-bold text-[#77716a]">
                URUTKAN BERDASARKAN
              </p>

              {(['Tanggal', 'Prioritas'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setSortBy(item)
                    setShowSort(false)
                  }}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
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

      {/* 3. Indikator Status */}
      <section className="grid w-full grid-cols-4 gap-2">
        <div className="flex flex-col items-center rounded-xl border-[1.5px] border-[#252525] bg-white px-1.5 py-2 shadow-[2px_2px_0_#252525]">
          <span className="text-sm font-extrabold leading-tight text-[#252525]">
            {total}
          </span>
          <span className="mt-1 rounded-full bg-[#f1ede6] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#252525]">
            Total
          </span>
        </div>

        <div className="flex flex-col items-center rounded-xl border-[1.5px] border-[#252525] bg-[#FB923C] px-1.5 py-2 shadow-[2px_2px_0_#252525]">
          <span className="text-sm font-extrabold leading-tight text-[#252525]">
            {inProgress}
          </span>
          <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#7c2d12]">
            Berjalan
          </span>
        </div>

        <div className="flex flex-col items-center rounded-xl border-[1.5px] border-[#252525] bg-[#4ADE80] px-1.5 py-2 shadow-[2px_2px_0_#252525]">
          <span className="text-sm font-extrabold leading-tight text-[#252525]">
            {completed}
          </span>
          <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#14532d]">
            Selesai
          </span>
        </div>

        <div className="flex flex-col items-center rounded-xl border-[1.5px] border-[#252525] bg-[#FFB5A7] px-1.5 py-2 shadow-[2px_2px_0_#252525]">
          <span className="text-sm font-extrabold leading-tight text-[#252525]">
            {overdue}
          </span>
          <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#5f160c]">
            Terlewat
          </span>
        </div>
      </section>

      {/* 4. Filter Satu Baris Horizontal */}
      <section
        data-no-swipe
        className="mx-auto flex w-fit max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto px-0.5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {filters.map((filter) => {
          const count =
            filter === 'Semua'
              ? total
              : filter === 'Hari Ini'
                ? tasks.filter(
                    (task) =>
                      task.date === todayString && task.status === 'todo',
                  ).length
                : filter === 'Selesai'
                  ? completed
                  : filter === 'Terlewat'
                    ? overdue
                    : tasks.filter(
                        (task) =>
                          task.date > todayString && task.status === 'todo',
                      ).length

          const active = activeFilter === filter

          return (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setActiveFilter(filter)
                setTaskActionMode('normal')
              }}
              style={{
                fontSize: '9.5px',
                lineHeight: 1,
                padding: '6px 10px',
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#252525] font-bold transition-all duration-150 ${
                active
                  ? 'translate-x-[1px] translate-y-[1px] border-[#252525]/75 bg-[#f7e5ab] text-[#252525]/80 shadow-none'
                  : 'bg-[#ffe69a] text-[#252525] shadow-[1px_1px_0_#252525] hover:bg-[#ffdf7e] active:translate-x-[1px] active:translate-y-[1px] active:bg-[#f7e5ab] active:shadow-none'
              }`}
            >
              <span>{filter}</span>
              <span
                style={{
                  fontSize: '8px',
                  lineHeight: 1,
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                }}
                className={`inline-flex items-center justify-center rounded-full border border-[#252525]/25 font-extrabold ${
                  active
                    ? 'bg-[#252525] text-[#FFE69A]'
                    : 'bg-white text-[#252525]'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </section>

      {/* Banner Mode Edit / Hapus Target */}
      {taskActionMode !== 'normal' && (
        <p className="rounded-lg bg-[#f5f0e7] px-3 py-2 text-xs font-medium text-[#77716a]">
          {taskActionMode === 'edit'
            ? 'Pilih target yang ingin diedit.'
            : 'Pilih target yang ingin dihapus.'}
          <button
            type="button"
            onClick={() => setTaskActionMode('normal')}
            className="ml-2 font-bold text-[#252525] underline"
          >
            Batal
          </button>
        </p>
      )}

      {/* 5. Daftar Output Target sesuai Filter */}
      <div className="pt-1">
        {activeFilter === 'Semua' && <TodaySection showEmptyState={false} />}

        {activeFilter === 'Hari Ini' && <TodaySection showEmptyState={true} />}

        {overdueTasks.length > 0 && (
          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#5f160c]">
                  Terlewat
                </h2>

                <span className="rounded-full border border-[#252525]/20 bg-[#FFB5A7] px-2.5 py-0.5 text-[11px] font-extrabold text-[#252525]">
                  {overdueTasks.length}
                </span>
              </div>

              <TaskActionButtons />
            </div>

            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}

        {upcomingTasks.length > 0 && (
          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#7c2d12]">
                  Mendatang &amp; Studi
                </h2>

                <span className="rounded-full border border-[#252525]/20 bg-[#FB923C] px-2.5 py-0.5 text-[11px] font-extrabold text-[#252525]">
                  {upcomingTasks.length}
                </span>
              </div>

              <TaskActionButtons />
            </div>

            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}

        {completedTasks.length > 0 && (
          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1e4620]">
                  Telah Diselesaikan
                </h2>

                <span className="rounded-full border border-[#252525]/20 bg-[#CDE8D3] px-2.5 py-0.5 text-[11px] font-bold text-[#1e4620]">
                  {completedTasks.length}
                </span>
              </div>

              <TaskActionButtons />
            </div>

            <div className="space-y-2">
              {completedTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}

        {/* Tampilan Kosong Filter Semua */}
        {activeFilter === 'Semua' && filteredTasks.length === 0 && (
          <section>
            <div className="rounded-xl border-2 border-dashed border-[#c7beb0] bg-white px-4 py-10 text-center">
              <CalendarDays size={28} className="mx-auto text-[#aaa197]" />

              <h3 className="mt-2.5 text-sm font-bold">
                Belum ada target
              </h3>

              <p className="mt-1 text-xs text-[#77716a]">
                Tekan tombol + Tambah Target di bawah untuk menambahkan target baru.
              </p>
            </div>
          </section>
        )}

        {/* Tampilan Kosong Khusus Filter Selesai / Terlewat / Mendatang */}
        {activeFilter === 'Selesai' && completedTasks.length === 0 && (
          <section>
            <div className="rounded-xl border-2 border-dashed border-[#c7beb0] bg-white px-4 py-10 text-center">
              <CalendarDays size={28} className="mx-auto text-[#aaa197]" />

              <h3 className="mt-2.5 text-sm font-bold">
                Belum ada target selesai
              </h3>

              <p className="mt-1 text-xs text-[#77716a]">
                Target yang sudah kamu centang selesai akan muncul di sini.
              </p>
            </div>
          </section>
        )}

        {activeFilter === 'Terlewat' && overdueTasks.length === 0 && (
          <section>
            <div className="rounded-xl border-2 border-dashed border-[#c7beb0] bg-white px-4 py-10 text-center">
              <CalendarDays size={28} className="mx-auto text-[#aaa197]" />

              <h3 className="mt-2.5 text-sm font-bold">
                Tidak ada target terlewat
              </h3>

              <p className="mt-1 text-xs text-[#77716a]">
                Semua target sebelumnya sudah tertangani dengan baik.
              </p>
            </div>
          </section>
        )}

        {activeFilter === 'Mendatang' && upcomingTasks.length === 0 && (
          <section>
            <div className="rounded-xl border-2 border-dashed border-[#c7beb0] bg-white px-4 py-10 text-center">
              <CalendarDays size={28} className="mx-auto text-[#aaa197]" />

              <h3 className="mt-2.5 text-sm font-bold">
                Belum ada target mendatang
              </h3>

              <p className="mt-1 text-xs text-[#77716a]">
                Tekan tombol + Tambah Target di bawah untuk menjadwalkan target berikutnya.
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Modal Edit Target */}
      {editingTask &&
        createPortal(
          <div
            onClick={() => setEditingTask(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#252525]/40 px-5 py-6 backdrop-blur-sm"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-task-modal-title"
              onClick={(event) => event.stopPropagation()}
              className="my-auto max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3
                  id="edit-task-modal-title"
                  className="text-base font-bold"
                >
                  Edit Target
                </h3>

                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  aria-label="Tutup"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0ece4] hover:bg-[#e5dfd3]"
                >
                  <X size={17} />
                </button>
              </div>

              <form onSubmit={handleSaveEditedTask} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    Nama target
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={80}
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Tulis nama target..."
                    className="w-full rounded-xl border-2 border-[#252525] bg-white px-3 py-2.5 text-sm font-semibold text-[#252525] outline-none focus:shadow-[3px_3px_0_#252525]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    Kategori
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryOptions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditCategory(cat)}
                        className={`rounded-lg border-[1.5px] border-[#252525] px-2.5 py-1 text-[11px] font-bold transition ${
                          editCategory === cat
                            ? 'bg-[#D9CCFF] shadow-[2px_2px_0_#252525]'
                            : 'bg-white hover:bg-[#f5f0e7]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold">
                    Prioritas
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {priorityOptions.map((prio) => (
                      <button
                        key={prio}
                        type="button"
                        onClick={() => setEditPriority(prio)}
                        className={`rounded-xl border-[1.5px] border-[#252525] py-2 text-xs font-extrabold transition ${
                          editPriority === prio
                            ? prio === 'Tinggi'
                              ? 'bg-[#ffb5a7] text-[#5f160c] shadow-[2px_2px_0_#252525]'
                              : prio === 'Sedang'
                                ? 'bg-[#ffe69a] text-[#252525] shadow-[2px_2px_0_#252525]'
                                : 'bg-[#ece8e0] text-[#252525] shadow-[2px_2px_0_#252525]'
                            : 'bg-white text-[#77716a]'
                        }`}
                      >
                        {prio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(event) => setEditDate(event.target.value)}
                      className="w-full rounded-xl border-2 border-[#252525] bg-white px-2.5 py-2 text-xs font-bold text-[#252525] outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold">
                      Waktu (WIB)
                    </label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(event) => setEditTime(event.target.value)}
                      className="w-full rounded-xl border-2 border-[#252525] bg-white px-2.5 py-2 text-xs font-bold text-[#252525] outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  data-sound="none"
                  className="flex w-full items-center justify-center rounded-xl border-2 border-[#252525] bg-[#ffe69a] px-4 py-3 text-sm font-extrabold text-[#252525] shadow-[3px_3px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Simpan Perubahan
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Konfirmasi Hapus Target Kustom */}
      {deleteTarget &&
        createPortal(
          <div
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-[#252525]/40 px-4 py-6 backdrop-blur-sm"
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
                Hapus target ini?
              </h2>

              <p className="mt-2 text-center text-xs leading-relaxed text-[#77716a]">
                Target <strong className="text-[#252525]">{deleteTarget.title}</strong> akan dihapus secara permanen dari daftar target.
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
                  data-sound="none"
                  onClick={confirmDeleteTarget}
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