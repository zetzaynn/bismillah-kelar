
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import {
  Camera,
  Check,
  ImagePlus,
  Trash2,
  UserCircle,
  X,
} from 'lucide-react'

import BottomNav, {
  type PageType,
} from './components/layout/BottomNav'

import AppHeader from './components/layout/AppHeader'
import TaskFormModal from './components/tasks/TaskFormModal'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Progress from './pages/Progress'
import More from './pages/More'

import { useAppData } from './hooks/AppContext'

const INTERACTION_SOUND_KEY = 'bismillah-kelar-interaction-sound'

const pageTitles: Record<PageType, string> = {
  today: 'Dashboard personal',
  tasks: 'Manajemen tugas',
  calendar: 'Agenda dan jadwal',
  progress: 'Perkembangan produktivitas',
  more: 'Pengaturan aplikasi',
}

const pageOrder: PageType[] = [
  'today',
  'tasks',
  'calendar',
  'progress',
  'more',
]

const notificationLabels = [
  {
    key: 'daily',
    title: 'Pengingat harian',
    description: 'Pengingat untuk memulai aktivitas harian.',
  },
  {
    key: 'deadline',
    title: 'Deadline tugas',
    description: 'Pengingat terkait tenggat tugas.',
  },
  {
    key: 'focus',
    title: 'Sesi fokus',
    description: 'Pemberitahuan ketika sesi fokus selesai.',
  },
  {
    key: 'reflection',
    title: 'Refleksi harian',
    description: 'Pengingat untuk melakukan refleksi.',
  },
  {
    key: 'habits',
    title: 'Kebiasaan',
    description: 'Pengingat untuk menjalankan kebiasaan harian.',
  },
] as const

function App() {
  const {
    data,
    profilePhotoUrl,
    updateProfile,
    updateProfilePhoto,
    removeProfilePhoto,
  } = useAppData()

  const [activePage, setActivePage] =
    useState<PageType>('today')

  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)

  const [profileName, setProfileName] = useState(
    data.profile.name,
  )

  const [selectedPhoto, setSelectedPhoto] =
    useState<File | null>(null)

  const [isSavingProfile, setIsSavingProfile] =
    useState(false)

  const [profileError, setProfileError] = useState('')

  const [exitWarning, setExitWarning] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const animationFrameRef = useRef<number | null>(null)
  const swipeFrameRef = useRef<number | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)

  const touchStartRef = useRef<{
    x: number
    y: number
    lastX: number
    lastTime: number
    velocityX: number
    width: number
    pointerId: number
    horizontal: boolean
  } | null>(null)

  const suppressClickRef = useRef(false)

  const lastBackPressRef = useRef(0)
  const exitTimerRef = useRef<number | null>(null)

  const isOnboarding = !data.profile.name.trim()

  // Efek suara interaksi global
  useEffect(() => {
    const playInteractionSound = (
      type: 'click' | 'toggle' | 'select',
    ) => {
      try {
        if (
          localStorage.getItem(INTERACTION_SOUND_KEY) === 'false'
        ) {
          return
        }

        const AudioContextClass = window.AudioContext

        if (!AudioContextClass) return

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass()
        }

        const context = audioContextRef.current

        if (context.state === 'suspended') {
          void context.resume()
        }

        const oscillator = context.createOscillator()
        const gain = context.createGain()

        const now = context.currentTime

        const frequencies = {
          click: 520,
          toggle: 680,
          select: 590,
        }

        oscillator.type = 'sine'

        oscillator.frequency.setValueAtTime(
          frequencies[type],
          now,
        )

        if (type === 'toggle') {
          oscillator.frequency.exponentialRampToValueAtTime(
            820,
            now + 0.08,
          )
        }

        if (type === 'select') {
          oscillator.frequency.exponentialRampToValueAtTime(
            740,
            now + 0.07,
          )
        }

        gain.gain.setValueAtTime(0.0001, now)

        gain.gain.exponentialRampToValueAtTime(
          1.0,
          now + 0.01,
        )

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + 0.13,
        )

        oscillator.connect(gain)
        gain.connect(context.destination)

        oscillator.start(now)
        oscillator.stop(now + 0.14)

        oscillator.onended = () => {
          oscillator.disconnect()
          gain.disconnect()
        }
      } catch (error) {
        console.warn(
          'Efek suara tidak dapat diputar:',
          error,
        )
      }
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target

      if (!(target instanceof Element)) return

      const interactive = target.closest(
        'button, a, [role="button"], [role="switch"], [data-sound]',
      )

      if (!interactive) return

      if (
        interactive instanceof HTMLButtonElement &&
        interactive.disabled
      ) {
        return
      }

      if (
        interactive.getAttribute('role') === 'switch' ||
        interactive.getAttribute('aria-pressed') !== null
      ) {
        playInteractionSound('toggle')
        return
      }

      playInteractionSound('click')
    }

    const handleChange = (event: Event) => {
      const target = event.target

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      ) {
        if (
          target instanceof HTMLInputElement &&
          ['checkbox', 'radio'].includes(target.type)
        ) {
          playInteractionSound('toggle')
        } else {
          playInteractionSound('select')
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('change', handleChange, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('change', handleChange, true)

      if (audioContextRef.current) {
        void audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

  // Animasi masuk halaman dan reset scroll
  useEffect(() => {
    // Setiap halaman baru dimulai dari posisi paling atas.
    window.scrollTo(0, 0)

    setPageVisible(false)

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = requestAnimationFrame(() => {
        setPageVisible(true)
        animationFrameRef.current = null
      })
    })

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [activePage])

  // Navigasi halaman
  const navigateToPage = (nextPage: PageType) => {
    if (nextPage === activePage) return

    touchStartRef.current = null
    setDragX(0)
    setIsDragging(false)
    setActivePage(nextPage)
  }

  // Konfirmasi tombol Back Android pada PWA
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & {
        standalone?: boolean
      }).standalone === true

    if (!isStandalone) return

    window.history.pushState(
      { bismillahKelar: true },
      '',
      window.location.href,
    )

    const handlePopState = () => {
      const now = Date.now()

      if (
        lastBackPressRef.current > 0 &&
        now - lastBackPressRef.current <= 2000
      ) {
        lastBackPressRef.current = 0
        setExitWarning(false)

        if (exitTimerRef.current !== null) {
          window.clearTimeout(exitTimerRef.current)
          exitTimerRef.current = null
        }

        return
      }

      lastBackPressRef.current = now
      setExitWarning(true)

      window.history.pushState(
        { bismillahKelar: true },
        '',
        window.location.href,
      )

      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
      }

      exitTimerRef.current = window.setTimeout(() => {
        lastBackPressRef.current = 0
        setExitWarning(false)
        exitTimerRef.current = null
      }, 2000)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)

      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
      }
    }
  }, [])

  // Membuka profil
  const handleOpenProfile = () => {
    setProfileName(data.profile.name)
    setSelectedPhoto(null)
    setProfileError('')
    setShowProfile(true)
    setShowNotifications(false)
  }

  // Memilih foto profil
  const handlePhotoChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setProfileError('Gunakan foto JPG, PNG, atau WebP.')
      event.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Ukuran foto maksimal 2 MB.')
      event.target.value = ''
      return
    }

    setSelectedPhoto(file)
    setProfileError('')
  }

  // Menyimpan profil
  const handleSaveProfile = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const trimmedName = profileName.trim()

    if (!trimmedName) {
      setProfileError('Nama tidak boleh kosong.')
      return
    }

    setIsSavingProfile(true)
    setProfileError('')

    try {
      if (selectedPhoto) {
        await updateProfilePhoto(selectedPhoto)
      }

      updateProfile({ name: trimmedName })

      setSelectedPhoto(null)
      setShowProfile(false)
    } catch (error) {
      console.error('Gagal menyimpan profil:', error)
      setProfileError(
        'Profil gagal disimpan. Silakan coba kembali.',
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Menghapus foto profil
  const handleRemovePhoto = async () => {
    try {
      await removeProfilePhoto()
      setSelectedPhoto(null)
      setProfileError('')
    } catch (error) {
      console.error('Gagal menghapus foto:', error)
      setProfileError('Foto gagal dihapus.')
    }
  }

  // Membuka notifikasi
  const handleOpenNotifications = () => {
    setShowNotifications(true)
    setShowProfile(false)
  }

  // Swipe interaktif
  const handleTouchStart = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (
      isOnboarding ||
      showProfile ||
      showNotifications ||
      showTaskModal ||
      swipeFrameRef.current !== null
    ) {
      return
    }

    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return
    }

    const target = event.target

    if (
      target instanceof Element &&
      target.closest(
        'input, textarea, select, [contenteditable="true"], [role="dialog"], [data-no-swipe], [data-swipe-ignore]',
      )
    ) {
      return
    }

    const now = performance.now()

    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: now,
      velocityX: 0,
      width: event.currentTarget.getBoundingClientRect().width,
      pointerId: event.pointerId,
      horizontal: false,
    }
  }

  const handleTouchMove = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const start = touchStartRef.current

    if (!start || start.pointerId !== event.pointerId) return

    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y

    if (!start.horizontal) {
      // Beri kesempatan scroll vertikal berjalan normal.
      if (
        Math.abs(deltaY) > 9 &&
        Math.abs(deltaY) > Math.abs(deltaX)
      ) {
        touchStartRef.current = null
        return
      }

      if (
        Math.abs(deltaX) < 5 ||
        Math.abs(deltaX) < Math.abs(deltaY) * 1.1
      ) {
        return
      }

      start.horizontal = true
      setIsDragging(true)

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture tidak selalu tersedia.
      }
    }

    const now = performance.now()
    const elapsed = Math.max(1, now - start.lastTime)

    start.velocityX =
      (event.clientX - start.lastX) / elapsed

    start.lastX = event.clientX
    start.lastTime = now

    const currentIndex = pageOrder.indexOf(activePage)
    const hasNext = currentIndex < pageOrder.length - 1
    const hasPrevious = currentIndex > 0

    let nextDrag = deltaX

    // Resistance di batas halaman pertama dan terakhir.
    if (
      (deltaX < 0 && !hasNext) ||
      (deltaX > 0 && !hasPrevious)
    ) {
      nextDrag = deltaX * 0.22
    }

    const limit = start.width * 1.05

    nextDrag = Math.max(
      -limit,
      Math.min(limit, nextDrag),
    )

    setDragX(nextDrag)
  }

  const handleTouchEnd = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const start = touchStartRef.current

    if (!start || start.pointerId !== event.pointerId) return

    touchStartRef.current = null

    if (
      isOnboarding ||
      showProfile ||
      showNotifications ||
      showTaskModal
    ) {
      setDragX(0)
      setIsDragging(false)
      return
    }

    if (!start.horizontal) return

    const deltaX = event.clientX - start.x
    const currentIndex = pageOrder.indexOf(activePage)

    const nextIndex =
      deltaX < 0 ? currentIndex + 1 : currentIndex - 1

    const canNavigate =
      nextIndex >= 0 && nextIndex < pageOrder.length

    const shouldNavigate =
      canNavigate &&
      (
        Math.abs(deltaX) > start.width * 0.2 ||
        Math.abs(start.velocityX) > 0.5
      )

    setIsDragging(false)

    if (shouldNavigate) {
      const nextPage = pageOrder[nextIndex]

      const incomingOffset =
        deltaX < 0
          ? start.width * 0.28
          : -start.width * 0.28

      suppressClickRef.current = true

      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 400)

      setActivePage(nextPage)
      setDragX(incomingOffset)
      setIsDragging(true)

      if (swipeFrameRef.current !== null) {
        cancelAnimationFrame(swipeFrameRef.current)
      }

      swipeFrameRef.current = requestAnimationFrame(() => {
        setIsDragging(false)
        setDragX(0)
        swipeFrameRef.current = null
      })
    } else {
      // Kembalikan halaman jika swipe belum cukup jauh.
      setDragX(0)
    }
  }

  const handleTouchCancel = () => {
    touchStartRef.current = null
    setIsDragging(false)
    setDragX(0)

    if (swipeFrameRef.current !== null) {
      cancelAnimationFrame(swipeFrameRef.current)
      swipeFrameRef.current = null
    }
  }

  // Menahan klik sesaat setelah swipe
  const handleClickCapture = (
    event: ReactMouseEvent<HTMLElement>,
  ) => {
    if (!suppressClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
  }

  const showGlobalFab =
    !isOnboarding &&
    ['today', 'tasks', 'calendar', 'progress'].includes(activePage)

  const renderPage = () => {
    switch (activePage) {
      case 'today':
        return <Today />

      case 'tasks':
        return <Tasks />

      case 'calendar':
        return <Calendar />

      case 'progress':
        return <Progress />

      case 'more':
  return (
    <More
      onEditProfile={() => setShowProfile(true)}
    />
  )

      default:
        return <Today />
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f2e9] text-[#252525]">
      <main className="mx-auto min-h-screen w-full max-w-[480px] bg-[#fffaf1] px-5 pb-28 pt-5">
        {!isOnboarding && (
          <AppHeader
            subtitle={pageTitles[activePage]}
            profileName={data.profile.name}
            profilePhotoUrl={profilePhotoUrl}
            onProfileClick={handleOpenProfile}
            onNotificationClick={handleOpenNotifications}
          />
        )}

        <div
          className={`${
            isOnboarding ? '' : 'mt-6'
          } overflow-hidden`}
        >
          <section
            className={`relative z-10 ${
              pageVisible ? 'opacity-100' : 'opacity-95'
            } touch-pan-y will-change-transform transition-opacity duration-200`}
            style={{
              transform: `translate3d(${dragX}px, 0, 0)`,
              transition: isDragging
                ? 'none'
                : 'transform 190ms cubic-bezier(0.2, 0.75, 0.25, 1), opacity 140ms ease',
              backgroundColor: '#fffaf1',
            }}
            onPointerDown={handleTouchStart}
            onPointerMove={handleTouchMove}
            onPointerUp={handleTouchEnd}
            onPointerCancel={handleTouchCancel}
            onClickCapture={handleClickCapture}
          >
            {isOnboarding ? (
              <div className="flex min-h-[75vh] flex-col justify-center">
                <div className="mb-8">
                  <span className="mb-3 inline-flex rounded-full bg-[#eee8d9] px-3 py-1 text-xs font-bold text-[#716b60]">
                    BISMILLAH KELAR
                  </span>

                  <h1 className="text-3xl font-extrabold leading-tight text-[#252525]">
                    Mari mulai
                    <br />
                    perjalananmu.
                  </h1>

                  <p className="mt-3 text-sm leading-relaxed text-[#827b70]">
                    Sebelum melanjutkan, kenalan dulu, yuk.
                    Isi nama yang ingin ditampilkan di aplikasi.
                  </p>
                </div>

                <form
                  onSubmit={handleSaveProfile}
                  className="space-y-5 rounded-2xl border-2 border-[#252525] bg-[#fff7e8] p-5 shadow-[4px_4px_0_#252525]"
                >
                  <div>
                    <label
                      htmlFor="onboarding-name"
                      className="mb-2 block text-sm font-bold"
                    >
                      Nama panggilan
                    </label>

                    <input
                      id="onboarding-name"
                      type="text"
                      value={profileName}
                      onChange={(event) =>
                        setProfileName(event.target.value)
                      }
                      placeholder="Masukkan namamu"
                      maxLength={40}
                      autoFocus
                      required
                      className="w-full rounded-xl border border-[#d9cfbd] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#252525]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Foto profil
                      <span className="ml-1 font-normal text-[#827b70]">
                        (opsional)
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c9bdab] bg-white p-3 hover:bg-[#faf5eb]">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eee8d9]">
                        {selectedPhoto ? (
                          <Camera size={19} />
                        ) : (
                          <ImagePlus size={19} />
                        )}
                      </span>

                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {selectedPhoto
                            ? selectedPhoto.name
                            : 'Pilih foto profil'}
                        </span>

                        <span className="block text-xs text-[#827b70]">
                          JPG, PNG, atau WebP · Maks. 2 MB
                        </span>
                      </span>

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {profileError && (
                    <p className="text-xs font-medium text-red-600">
                      {profileError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#252525] bg-[#252525] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3b3b3b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check size={17} />

                    {isSavingProfile
                      ? 'Menyimpan...'
                      : 'Mulai sekarang'}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-[#827b70]">
                  Satu langkah kecil untuk hari yang lebih terarah.
                </p>
              </div>
            ) : (
              renderPage()
            )}
          </section>
        </div>
      </main>

      {!isOnboarding && (
        <BottomNav
          activePage={activePage}
          onNavigate={navigateToPage}
        />
      )}

      {/* FAB Tambah Target */}
      {showGlobalFab && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 flex w-full max-w-[480px] -translate-x-1/2 justify-end px-5">
          <button
            type="button"
            onClick={() => {
              setActivePage('tasks')
              setShowTaskModal(true)
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-[#252525] bg-[#d9ccff] px-5 py-3 text-xs font-bold text-[#252525] shadow-[3px_3px_0_#252525] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Tambah Target
          </button>
        </div>
      )}

      <TaskFormModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
      />

      {/* Peringatan tombol Back */}
      {exitWarning && !isOnboarding && (
        <div className="fixed bottom-24 left-1/2 z-[70] w-[calc(100%-40px)] max-w-[440px] -translate-x-1/2">
          <div className="rounded-xl border-2 border-[#252525] bg-[#fff1c5] px-4 py-3 text-center shadow-[3px_3px_0_#252525]">
            <p className="text-sm font-bold text-[#252525]">
              Tekan sekali lagi untuk keluar
            </p>

            <p className="mt-1 text-[11px] text-[#716b60]">
              Tekan tombol Back Android sekali lagi dalam 2 detik.
            </p>
          </div>
        </div>
      )}

      {/* Modal profil */}
      {showProfile && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-5 py-8"
          onClick={() => setShowProfile(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
            className="w-full max-w-[420px] rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="profile-title"
                className="text-lg font-extrabold"
              >
                Profil pengguna
              </h2>

              <button
                type="button"
                aria-label="Tutup profil"
                onClick={() => setShowProfile(false)}
                className="rounded-full p-2 hover:bg-[#eee8d9]"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={handleSaveProfile}
              className="space-y-5"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#252525] bg-[#252525] text-white">
                  {selectedPhoto ? (
                    <div className="flex h-full w-full items-center justify-center bg-[#eee8d9] text-[#252525]">
                      <Camera size={25} />
                    </div>
                  ) : profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Foto profil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle size={38} />
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#eee8d9] px-3 py-2 text-xs font-bold hover:bg-[#e5dece]">
                  <Camera size={15} />

                  {selectedPhoto ? 'Foto dipilih' : 'Ganti foto'}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                {profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                  >
                    <Trash2 size={13} />
                    Hapus foto profil
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-2 block text-sm font-bold"
                >
                  Nama panggilan
                </label>

                <input
                  id="profile-name"
                  type="text"
                  value={profileName}
                  onChange={(event) =>
                    setProfileName(event.target.value)
                  }
                  maxLength={40}
                  required
                  className="w-full rounded-xl border border-[#d9cfbd] bg-white px-4 py-3 text-sm outline-none focus:border-[#252525]"
                />
              </div>

              {profileError && (
                <p className="text-xs font-medium text-red-600">
                  {profileError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full rounded-xl border-2 border-[#252525] bg-[#252525] px-4 py-3 text-sm font-bold text-white hover:bg-[#3b3b3b] disabled:opacity-60"
              >
                {isSavingProfile
                  ? 'Menyimpan...'
                  : 'Simpan perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Panel notifikasi */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-5 py-8"
          onClick={() => setShowNotifications(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-title"
            className="w-full max-w-[420px] rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  id="notification-title"
                  className="text-lg font-extrabold"
                >
                  Notifikasi
                </h2>

                <p className="mt-1 text-xs text-[#827b70]">
                  Ringkasan pengaturan pengingatmu.
                </p>
              </div>

              <button
                type="button"
                aria-label="Tutup notifikasi"
                onClick={() => setShowNotifications(false)}
                className="rounded-full p-2 hover:bg-[#eee8d9]"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-3">
              {notificationLabels.map((item) => {
                const enabled =
                  data.settings.notifications[item.key]

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e5ddcf] bg-[#fff7e8] p-3"
                  >
                    <div>
                      <p className="text-sm font-bold">
                        {item.title}
                      </p>

                      <p className="mt-0.5 text-xs leading-relaxed text-[#827b70]">
                        {item.description}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        enabled
                          ? 'bg-[#dcebd5] text-[#42633b]'
                          : 'bg-[#eee8e0] text-[#827b70]'
                      }`}
                    >
                      {enabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-[#827b70]">
              Pengaturan pengingat dapat diubah melalui halaman
              Pengaturan aplikasi.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
