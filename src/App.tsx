import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  Camera,
  Clock3,
  MessageSquareHeart,
  Settings,
  Trash2,
  X,
} from 'lucide-react'

import BottomNav, {
  type PageType,
} from './components/layout/BottomNav'

import AppHeader, {
  DEFAULT_PROFILE_PHOTO_URL,
} from './components/layout/AppHeader'
import TaskFormModal from './components/tasks/TaskFormModal'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Progress from './pages/Progress'
import More from './pages/More'

import { useAppData } from './hooks/AppContext'
import { playInteractionSound } from './lib/interactionSound'

const PWA_CAT_ICON_URL = `${import.meta.env.BASE_URL}pwa-192x192.png`

type LaunchStage = 'splash' | 'greeting' | 'app'

const pageTitles: Record<PageType, string> = {
  today: 'Fokus dan rutinitas harian',
  tasks: 'Manajemen target dan tugas',
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

function getDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function App() {
  const {
    data,
    profilePhotoUrl,
    updateProfile,
    updateProfilePhoto,
    removeProfilePhoto,
    updateSettings,
  } = useAppData()

  const [launchStage, setLaunchStage] =
    useState<LaunchStage>('splash')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingDone, setLoadingDone] = useState(false)
  const [splashExiting, setSplashExiting] = useState(false)
  const [dotCount, setDotCount] = useState(1)
  const [greetingCountdown, setGreetingCountdown] = useState(3)
  const [greetingExiting, setGreetingExiting] = useState(false)

  const [activePage, setActivePage] =
    useState<PageType>('today')

  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [scrollToNotificationsTick, setScrollToNotificationsTick] =
    useState(0)

  const [profileName, setProfileName] = useState(
    data.profile.name,
  )
  const [profileGreeting, setProfileGreeting] = useState(
    data.settings.greeting,
  )

  const [selectedPhoto, setSelectedPhoto] =
    useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<
    string | null
  >(null)

  const [isSavingProfile, setIsSavingProfile] =
    useState(false)

  const [profileError, setProfileError] = useState('')

  const [exitWarning, setExitWarning] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeWidth, setSwipeWidth] = useState(480)

  const mainContentRef = useRef<HTMLElement | null>(null)
  const bottomChromeRef = useRef<HTMLDivElement | null>(null)
  const swipeContainerRef = useRef<HTMLDivElement | null>(null)
  const swipeSnapTimerRef = useRef<number | null>(null)
  const enterAppTimerRef = useRef<number | null>(null)

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
  const isOnboardingRef = useRef(isOnboarding)
  isOnboardingRef.current = isOnboarding

  const todayString = getDateString(new Date())
  const isLaunchLocked = launchStage !== 'app'

  useEffect(() => {
    const prevHtmlOverflowX = document.documentElement.style.overflowX
    const prevBodyOverflowX = document.body.style.overflowX

    const overflowValue =
      typeof CSS !== 'undefined' && CSS.supports('overflow-x', 'clip')
        ? 'clip'
        : 'hidden'

    document.documentElement.style.overflowX = overflowValue
    document.body.style.overflowX = overflowValue

    return () => {
      document.documentElement.style.overflowX = prevHtmlOverflowX
      document.body.style.overflowX = prevBodyOverflowX
    }
  }, [])

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.inert = isLaunchLocked
    }
    if (bottomChromeRef.current) {
      bottomChromeRef.current.inert = isLaunchLocked
    }

    if (!isLaunchLocked) return

    window.scrollTo(0, 0)

    const htmlEl = document.documentElement
    const bodyEl = document.body

    const prevHtmlOverflowY = htmlEl.style.overflowY
    const prevBodyOverflowY = bodyEl.style.overflowY
    const prevHtmlOverscroll = htmlEl.style.overscrollBehavior
    const prevBodyOverscroll = bodyEl.style.overscrollBehavior
    const prevBodyTouchAction = bodyEl.style.touchAction

    htmlEl.style.overflowY = 'hidden'
    bodyEl.style.overflowY = 'hidden'
    htmlEl.style.overscrollBehavior = 'none'
    bodyEl.style.overscrollBehavior = 'none'
    bodyEl.style.touchAction = 'none'

    const preventBackgroundScroll = (event: Event) => {
      event.preventDefault()
    }

    window.addEventListener('wheel', preventBackgroundScroll, {
      passive: false,
    })
    window.addEventListener('touchmove', preventBackgroundScroll, {
      passive: false,
    })

    return () => {
      htmlEl.style.overflowY = prevHtmlOverflowY
      bodyEl.style.overflowY = prevBodyOverflowY
      htmlEl.style.overscrollBehavior = prevHtmlOverscroll
      bodyEl.style.overscrollBehavior = prevBodyOverscroll
      bodyEl.style.touchAction = prevBodyTouchAction

      window.removeEventListener('wheel', preventBackgroundScroll)
      window.removeEventListener('touchmove', preventBackgroundScroll)
    }
  }, [isLaunchLocked])

  useEffect(() => {
    if (launchStage !== 'splash') return

    setLoadingProgress(0)
    setLoadingDone(false)
    setSplashExiting(false)
    setDotCount(1)

    const dotInterval = window.setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1))
    }, 340)

    const durationMs = 1550
    const startTime = performance.now()
    let rafId: number | null = null
    let transitionStartTimer: number | null = null
    let transitionEndTimer: number | null = null

    const tick = (now: number) => {
      const elapsed = now - startTime
      const rawRatio = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - rawRatio, 2.2)
      setLoadingProgress(Math.round(eased * 100))

      if (rawRatio < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        setLoadingDone(true)
        transitionStartTimer = window.setTimeout(() => {
          setSplashExiting(true)

          if (isOnboardingRef.current) {
            setLaunchStage('app')
          } else {
            setGreetingCountdown(3)
            setGreetingExiting(false)
            setLaunchStage('greeting')
          }

          transitionEndTimer = window.setTimeout(() => {
            setSplashExiting(false)
          }, 360)
        }, 200)
      }
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      window.clearInterval(dotInterval)
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (transitionStartTimer !== null) {
        window.clearTimeout(transitionStartTimer)
      }
      if (transitionEndTimer !== null) {
        window.clearTimeout(transitionEndTimer)
      }
    }
  }, [launchStage])

  const enterMainApp = () => {
    if (greetingExiting || launchStage === 'app') return

    setGreetingExiting(true)

    if (enterAppTimerRef.current !== null) {
      window.clearTimeout(enterAppTimerRef.current)
    }

    enterAppTimerRef.current = window.setTimeout(() => {
      setLaunchStage('app')
      setGreetingExiting(false)
      enterAppTimerRef.current = null
    }, 320)
  }

  useEffect(() => {
    return () => {
      if (enterAppTimerRef.current !== null) {
        window.clearTimeout(enterAppTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (launchStage !== 'greeting') return

    setGreetingCountdown(3)

    const timer2 = window.setTimeout(() => {
      setGreetingCountdown(2)
    }, 950)

    const timer1 = window.setTimeout(() => {
      setGreetingCountdown(1)
    }, 1900)

    const timerEnter = window.setTimeout(() => {
      enterMainApp()
    }, 2850)

    return () => {
      window.clearTimeout(timer2)
      window.clearTimeout(timer1)
      window.clearTimeout(timerEnter)
    }
  }, [launchStage])

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedPhoto)
    setPhotoPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedPhoto])

  useEffect(() => {
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

      const soundAttr = interactive.getAttribute('data-sound')

      if (soundAttr === 'none') {
        return
      }

      if (soundAttr === 'success') {
        playInteractionSound('success')
        return
      }

      if (soundAttr === 'check') {
        playInteractionSound('check')
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
        if (target.getAttribute('data-sound') === 'none') return

        if (
          target instanceof HTMLInputElement &&
          ['checkbox', 'radio'].includes(target.type)
        ) {
          playInteractionSound('check')
        } else {
          playInteractionSound('click')
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('change', handleChange, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('change', handleChange, true)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activePage])

  const navigateToPage = (nextPage: PageType) => {
    if (nextPage === activePage) return

    if (swipeSnapTimerRef.current !== null) {
      window.clearTimeout(swipeSnapTimerRef.current)
      swipeSnapTimerRef.current = null
    }

    touchStartRef.current = null
    setDragX(0)
    setIsDragging(false)
    setActivePage(nextPage)
  }

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

  const overdueReminders = useMemo(
    () =>
      data.tasks
        .filter(
          (task) => task.status === 'todo' && task.date < todayString,
        )
        .sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
        ),
    [data.tasks, todayString],
  )

  const pendingTodayTasks = useMemo(
    () =>
      data.tasks
        .filter(
          (task) => task.date === todayString && task.status === 'todo',
        )
        .sort((a, b) => a.time.localeCompare(b.time)),
    [data.tasks, todayString],
  )

  const pendingTodayAgenda = useMemo(
    () =>
      (data.agenda[todayString] ?? [])
        .filter((item) => !item.done)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [data.agenda, todayString],
  )

  const activeReminderCount =
    overdueReminders.length +
    pendingTodayTasks.length +
    pendingTodayAgenda.length

  const handleOpenProfile = () => {
    setProfileName(data.profile.name)
    setProfileGreeting(data.settings.greeting)
    setSelectedPhoto(null)
    setProfileError('')
    setShowProfile(true)
    setShowNotifications(false)
  }

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

    setSelectedPhoto(file)
    setProfileError('')
  }

  const handleSaveProfile = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const trimmedName = profileName.trim()
    const trimmedGreeting =
      profileGreeting.trim() || 'Bismillah, siap menuntaskan hari ini'

    if (!trimmedName) {
      setProfileError('Nama tidak boleh kosong.')
      return
    }

    const wasOnboarding = isOnboarding

    setIsSavingProfile(true)
    setProfileError('')

    try {
      if (selectedPhoto) {
        await updateProfilePhoto(selectedPhoto)
      }

      updateProfile({ name: trimmedName })
      updateSettings({ greeting: trimmedGreeting })

      playInteractionSound('success')

      setSelectedPhoto(null)
      setShowProfile(false)

      if (wasOnboarding) {
        setGreetingCountdown(3)
        setGreetingExiting(false)
        setLaunchStage('greeting')
      }
    } catch (error) {
      console.error('Gagal menyimpan profil:', error)
      setProfileError(
        'Profil gagal disimpan. Silakan coba kembali.',
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleRemovePhoto = async () => {
    try {
      if (selectedPhoto) {
        setSelectedPhoto(null)
        setProfileError('')
        return
      }

      await removeProfilePhoto()
      setProfileError('')
    } catch (error) {
      console.error('Gagal menghapus foto:', error)
      setProfileError('Foto gagal dihapus.')
    }
  }

  const handleOpenNotifications = () => {
    setShowNotifications(true)
    setShowProfile(false)
  }

  const handleTouchStart = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (
      launchStage !== 'app' ||
      isOnboarding ||
      showProfile ||
      showNotifications ||
      showTaskModal ||
      swipeSnapTimerRef.current !== null
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
        'input, textarea, select, [contenteditable="true"], [role="dialog"], [aria-modal="true"], [data-no-swipe], [data-swipe-ignore]',
      )
    ) {
      return
    }

    const measuredWidth =
      swipeContainerRef.current?.getBoundingClientRect().width ||
      event.currentTarget.getBoundingClientRect().width ||
      window.innerWidth ||
      480

    const now = performance.now()

    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: now,
      velocityX: 0,
      width: measuredWidth,
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
      setSwipeWidth(start.width)
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

    if (
      (deltaX < 0 && !hasNext) ||
      (deltaX > 0 && !hasPrevious)
    ) {
      nextDrag = deltaX * 0.22
    }

    nextDrag = Math.max(
      -start.width,
      Math.min(start.width, nextDrag),
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
      launchStage !== 'app' ||
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
        Math.abs(start.velocityX) > 0.45
      )

    setIsDragging(false)

    if (shouldNavigate) {
      const nextPage = pageOrder[nextIndex]
      const targetOffset =
        deltaX < 0 ? -start.width : start.width

      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 360)

      setDragX(targetOffset)

      if (swipeSnapTimerRef.current !== null) {
        window.clearTimeout(swipeSnapTimerRef.current)
      }

      swipeSnapTimerRef.current = window.setTimeout(() => {
        setActivePage(nextPage)
        setDragX(0)
        swipeSnapTimerRef.current = null
      }, 215)
    } else {
      setDragX(0)
    }
  }

  const handleTouchCancel = () => {
    touchStartRef.current = null
    setIsDragging(false)
    setDragX(0)

    if (swipeSnapTimerRef.current !== null) {
      window.clearTimeout(swipeSnapTimerRef.current)
      swipeSnapTimerRef.current = null
    }
  }

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

  const renderPageByType = (page: PageType) => {
    switch (page) {
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
            onEditProfile={() => handleOpenProfile()}
            scrollToNotificationsTick={scrollToNotificationsTick}
          />
        )

      default:
        return <Today />
    }
  }

  const isSwiping = isDragging || dragX !== 0
  const currentPageIndex = pageOrder.indexOf(activePage)
  const prevPage =
    currentPageIndex > 0 ? pageOrder[currentPageIndex - 1] : null
  const nextPage =
    currentPageIndex < pageOrder.length - 1
      ? pageOrder[currentPageIndex + 1]
      : null

  const activeProfilePreview =
    photoPreviewUrl || profilePhotoUrl || DEFAULT_PROFILE_PHOTO_URL
  const displayAvatar = profilePhotoUrl || DEFAULT_PROFILE_PHOTO_URL
  const displayUserName = data.profile.name.trim() || 'Teman Produktif'
  const clampedProgress = Math.min(100, Math.max(0, loadingProgress))
  const showSplashLayer = launchStage === 'splash' || splashExiting

  return (
    <div className="min-h-screen w-full bg-[#fffaf1] text-[#252525] sm:bg-[#f5f2e9]">
      <style>{`
        @keyframes greetingBackdropIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes greetingBackdropOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes greetingCardEntrance {
          0% {
            opacity: 0;
            transform: scale(0.86) translateY(20px);
          }
          65% {
            opacity: 1;
            transform: scale(1.02) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes greetingCardExit {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.92) translateY(14px);
          }
        }
        @keyframes greetingPopIn {
          0% {
            opacity: 0;
            transform: scale(0.82) translateY(8px);
          }
          65% {
            opacity: 1;
            transform: scale(1.04) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      {/* TAHAP 1: Splash Screen */}
      {showSplashLayer && (
        <div
          aria-hidden={splashExiting}
          className={`fixed inset-0 z-[110] flex touch-none select-none items-center justify-center bg-[#fffaf1] px-5 text-[#252525] transition-all duration-350 ease-out ${
            splashExiting
              ? 'pointer-events-none scale-[1.03] opacity-0'
              : 'scale-100 opacity-100'
          }`}
        >
          <div
            className={`flex w-full max-w-[420px] flex-col items-center justify-center rounded-3xl border-2 border-[#252525] bg-[#fffaf1] px-6 py-12 text-center transition-all duration-300 ${
              loadingDone
                ? 'scale-[0.98] shadow-none'
                : 'scale-100 shadow-[6px_6px_0_#252525]'
            }`}
          >
            <div
              className={`relative h-28 w-28 overflow-hidden rounded-3xl border-2 border-[#252525] bg-[#D9CCFF] transition-shadow duration-200 ${
                loadingDone ? 'shadow-none' : 'shadow-[4px_4px_0_#252525]'
              }`}
            >
              <img
                src={PWA_CAT_ICON_URL}
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_PROFILE_PHOTO_URL
                }}
                alt="Ikon Aplikasi Bismillah Kelar"
                className="h-full w-full scale-110 object-cover"
              />
            </div>

            <span className="mt-6 rounded-xl border-2 border-[#252525] bg-[#FFE69A] px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#252525] shadow-[3px_3px_0_#252525]">
              BISMILLAH KELAR
            </span>

            <h1 className="mt-3 flex items-center justify-center text-2xl font-extrabold tracking-tight">
              <span>Memuat ruang target</span>
              <span
                aria-hidden="true"
                className="inline-block w-6 text-left"
              >
                {'.'.repeat(dotCount)}
              </span>
            </h1>

            <p className="mt-1.5 text-xs text-[#77716a]">
              Menyiapkan jadwal, fokus, dan amanah hari ini
            </p>

            <div className="mt-8 w-full max-w-[270px]">
              <div className="relative flex items-center">
                <div className="h-4 w-full overflow-hidden rounded-full border-2 border-[#252525] bg-[#eee8d9]">
                  <div
                    className="h-full rounded-full bg-[#B9A4FF]"
                    style={{
                      width: `${clampedProgress}%`,
                    }}
                  />
                </div>

                <div
                  className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(${clampedProgress}% * 0.88 + 6%)`,
                  }}
                >
                  <div className="h-8 w-8 overflow-hidden rounded-full border-2 border-[#252525] bg-[#D9CCFF]">
                    <img
                      src={PWA_CAT_ICON_URL}
                      onError={(event) => {
                        event.currentTarget.src = DEFAULT_PROFILE_PHOTO_URL
                      }}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full scale-110 object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[10px] font-extrabold text-[#625779]">
                <span>Mulai</span>
                <span>{clampedProgress}%</span>
                <span>Finish</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAHAP 2: Overlay Sapaan Melayang */}
      {launchStage === 'greeting' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sapaan Beranda"
          style={{
            animation: greetingExiting
              ? 'greetingBackdropOut 320ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
              : 'greetingBackdropIn 360ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }}
          className={`fixed inset-0 z-[100] flex touch-none select-none items-center justify-center overscroll-none bg-black/35 px-5 py-6 text-[#252525] backdrop-blur-md ${
            greetingExiting ? 'pointer-events-none' : ''
          }`}
        >
          <div
            style={{
              animation: greetingExiting
                ? 'greetingCardExit 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
                : 'greetingCardEntrance 460ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
            className="w-full max-w-[420px] rounded-3xl border-2 border-[#252525] bg-[#D9CCFF] p-6 shadow-[6px_6px_0_#252525]"
          >
            <div className="flex flex-col items-center pt-1 text-center">
              <div className="h-48 w-48 overflow-hidden rounded-3xl border-2 border-[#252525] bg-[#fffaf1] shadow-none sm:h-52 sm:w-52">
                <img
                  src={displayAvatar}
                  alt={`Avatar ${displayUserName}`}
                  className="h-full w-full object-cover"
                />
              </div>

              <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-[#4a3f6b]">
                Assalamu&apos;alaikum, {displayUserName}
              </p>

              <div
                style={{
                  animation:
                    'greetingPopIn 560ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both',
                }}
                className="mt-3 w-full rounded-2xl border-2 border-[#252525] bg-[#fffaf1] px-4 py-3.5 shadow-[3px_3px_0_#252525]"
              >
                <h1 className="text-lg font-extrabold leading-snug text-[#252525] sm:text-xl">
                  “{data.settings.greeting}”
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={enterMainApp}
              disabled={greetingExiting}
              className="mx-auto mt-5 flex w-[65%] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-[#252525] bg-[#252525] px-3.5 py-2.5 text-[11px] font-extrabold text-[#FFE69A] shadow-[3px_3px_0_#fffaf1] transition hover:bg-[#383838] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-70"
            >
              <span>Masuk ke Hari Ini</span>
              <ArrowRight size={14} className="shrink-0" />
            </button>

            <div className="mt-3.5 flex items-center justify-center gap-2 text-xs font-extrabold text-[#4a3f6b]">
              <span>Masuk otomatis dalam</span>
              <span
                key={greetingCountdown}
                style={{
                  animation:
                    'greetingPopIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#252525] bg-[#FFE69A] text-xs font-black text-[#252525]"
              >
                {greetingCountdown}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Menu Utama */}
      <main
        ref={mainContentRef}
        aria-hidden={isLaunchLocked}
        className={`mx-auto min-h-screen w-full max-w-[480px] bg-[#fffaf1] pt-0 ${
          isOnboarding ? 'pb-6' : 'pb-28'
        } ${
          isLaunchLocked ? 'pointer-events-none select-none overflow-hidden' : ''
        }`}
      >
        {!isOnboarding && (
          <div className="sticky top-0 z-30 bg-[#fffaf1] px-5">
            <AppHeader
              subtitle={pageTitles[activePage]}
              profileName={data.profile.name}
              profilePhotoUrl={profilePhotoUrl}
              reminderCount={activeReminderCount}
              onProfileClick={handleOpenProfile}
              onNotificationClick={handleOpenNotifications}
            />
          </div>
        )}

        <div
          ref={swipeContainerRef}
          className={
            isOnboarding
              ? 'px-5 pt-4'
              : 'mt-4 w-full overflow-x-hidden'
          }
        >
          <section
            className="relative z-10 w-full touch-pan-y bg-[#fffaf1]"
            onPointerDown={handleTouchStart}
            onPointerMove={handleTouchMove}
            onPointerUp={handleTouchEnd}
            onPointerCancel={handleTouchCancel}
            onClickCapture={handleClickCapture}
          >
            {isOnboarding ? (
              <div className="flex min-h-[calc(100dvh-2.5rem)] flex-col justify-center">
                <div className="mb-3.5 mt-4 text-left">
                  <h1 className="text-[26px] font-extrabold leading-tight text-[#252525]">
                    Mari mulai perjalananmu.
                  </h1>
                </div>

                <form
                  onSubmit={handleSaveProfile}
                  className="space-y-2.5 rounded-2xl border-2 border-[#252525] bg-[#FFE69A] px-4 py-3.5 shadow-[4px_4px_0_#252525]"
                >
                  <div className="flex flex-col items-center text-center">
                    <label className="group flex cursor-pointer flex-col items-center gap-1.5">
                      <span className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl border-2 border-[#252525] bg-[#fffaf1] shadow-[3px_3px_0_#252525] transition group-hover:scale-[1.01]">
                        <img
                          src={photoPreviewUrl || DEFAULT_PROFILE_PHOTO_URL}
                          alt="Preview foto profil"
                          className="h-full w-full object-cover"
                        />
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#252525] bg-[#fffaf1] px-3 py-1 text-[11px] font-extrabold text-[#252525] shadow-[2px_2px_0_#252525] transition group-hover:bg-white">
                        <Camera size={13} />
                        <span className="max-w-[180px] truncate">
                          {selectedPhoto
                            ? selectedPhoto.name
                            : 'Ganti foto profil'}
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

                  <div className="space-y-1.5">
                    <div className="text-left">
                      <label
                        htmlFor="onboarding-name"
                        className="mb-0.5 block text-left text-xs font-extrabold text-[#252525]"
                      >
                        Nama panggilan
                      </label>

                      <textarea
                        id="onboarding-name"
                        rows={1}
                        enterKeyHint="done"
                        value={profileName}
                        onChange={(event) =>
                          setProfileName(event.target.value.replace(/\r?\n/g, ''))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            event.currentTarget.blur()
                          }
                        }}
                        placeholder="Masukkan namamu"
                        maxLength={40}
                        autoFocus
                        required
                        className="w-full resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white px-3.5 py-2 text-left text-sm font-semibold text-[#252525] outline-none transition placeholder:font-normal placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                      />
                    </div>

                    <div className="text-left">
                      <label
                        htmlFor="onboarding-greeting"
                        className="mb-0.5 block text-left text-xs font-extrabold text-[#252525]"
                      >
                        Sapaan beranda
                      </label>

                      <textarea
                        id="onboarding-greeting"
                        rows={1}
                        enterKeyHint="done"
                        value={profileGreeting}
                        onChange={(event) =>
                          setProfileGreeting(
                            event.target.value.replace(/\r?\n/g, ' '),
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            event.currentTarget.blur()
                          }
                        }}
                        placeholder="Contoh: Bismillah, satu langkah kecil hari ini"
                        maxLength={100}
                        className="w-full resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white px-3.5 py-2 text-left text-sm font-semibold text-[#252525] outline-none transition placeholder:font-normal placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                      />
                    </div>
                  </div>

                  {profileError && (
                    <p className="rounded-lg border border-[#252525] bg-white/90 px-3 py-1.5 text-xs font-bold text-red-600">
                      {profileError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    data-sound="none"
                    className="mx-auto mt-1 flex w-[65%] items-center justify-center gap-1.5 rounded-xl border-2 border-[#252525] bg-[#252525] px-3.5 py-2.5 text-xs font-extrabold text-[#FFE69A] shadow-[3px_3px_0_#D9CCFF] transition hover:bg-[#383838] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      {isSavingProfile
                        ? 'Menyimpan...'
                        : 'Mulai sekarang'}
                    </span>
                    <ArrowRight size={15} />
                  </button>
                </form>

                <p className="mt-3 text-left text-xs text-[#827b70]">
                  Satu langkah kecil untuk hari yang lebih terarah.
                </p>
              </div>
            ) : isSwiping ? (
              <div className="relative w-full">
                {prevPage && dragX > 0 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 w-full px-5 will-change-transform"
                    style={{
                      transform: `translate3d(${-swipeWidth + dragX}px, 0, 0)`,
                      transition: isDragging
                        ? 'none'
                        : 'transform 215ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {renderPageByType(prevPage)}
                  </div>
                )}

                <div
                  className="w-full px-5 will-change-transform"
                  style={{
                    transform: `translate3d(${dragX}px, 0, 0)`,
                    transition: isDragging
                      ? 'none'
                      : 'transform 215ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {renderPageByType(activePage)}
                </div>

                {nextPage && dragX < 0 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 w-full px-5 will-change-transform"
                    style={{
                      transform: `translate3d(${swipeWidth + dragX}px, 0, 0)`,
                      transition: isDragging
                        ? 'none'
                        : 'transform 215ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {renderPageByType(nextPage)}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full px-5">
                {renderPageByType(activePage)}
              </div>
            )}
          </section>
        </div>
      </main>

      <div
        ref={bottomChromeRef}
        aria-hidden={isLaunchLocked}
        className={isLaunchLocked ? 'pointer-events-none select-none' : ''}
      >
        {!isOnboarding && (
          <BottomNav
            activePage={activePage}
            onNavigate={navigateToPage}
          />
        )}

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
      </div>

      <TaskFormModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
      />

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

      {showProfile && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-5 py-6 backdrop-blur-sm"
          onClick={() => setShowProfile(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
            className="max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2
                  id="profile-title"
                  className="text-lg font-extrabold"
                >
                  Profil &amp; Sapaan
                </h2>
                <p className="text-xs text-[#77716a]">
                  Atur foto, nama panggilan, dan sapaan beranda
                </p>
              </div>

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
              className="space-y-4"
            >
              <div className="flex flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-[#252525] bg-[#D9CCFF]/45 p-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#252525] bg-[#fffaf1] shadow-[2px_2px_0_#252525]">
                  <img
                    src={activeProfilePreview}
                    alt="Preview foto profil"
                    className="h-full w-full object-cover"
                  />
                </div>

                {selectedPhoto && (
                  <span className="rounded-full bg-[#BDECCF] px-2.5 py-0.5 text-[11px] font-bold text-[#1e4620]">
                    Preview foto baru siap disimpan
                  </span>
                )}

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border-[1.5px] border-[#252525] bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_#252525] hover:bg-[#ffe69a]">
                  <Camera size={15} />

                  {selectedPhoto ? 'Ganti foto lain' : 'Ganti foto profil'}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                {(profilePhotoUrl || selectedPhoto) && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                  >
                    <Trash2 size={13} />
                    {selectedPhoto
                      ? 'Batalkan pilihan foto'
                      : 'Kembalikan ke foto default'}
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-1.5 block text-xs font-extrabold"
                >
                  Nama panggilan
                </label>

                <textarea
                  id="profile-name"
                  rows={1}
                  enterKeyHint="done"
                  value={profileName}
                  onChange={(event) =>
                    setProfileName(event.target.value.replace(/\r?\n/g, ''))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      event.currentTarget.blur()
                    }
                  }}
                  maxLength={40}
                  required
                  className="w-full resize-none overflow-x-auto whitespace-nowrap rounded-xl border-2 border-[#252525] bg-white px-4 py-2.5 text-sm font-bold text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-greeting"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold"
                >
                  <MessageSquareHeart size={14} className="text-[#51476b]" />
                  <span>Sapaan beranda</span>
                </label>

                <textarea
                  id="profile-greeting"
                  rows={2}
                  value={profileGreeting}
                  onChange={(event) =>
                    setProfileGreeting(event.target.value)
                  }
                  maxLength={100}
                  placeholder="Tulis kalimat sapaan yang muncul saat membuka aplikasi..."
                  className="w-full resize-none rounded-xl border-2 border-[#252525] bg-white px-3.5 py-2.5 text-sm text-[#252525] outline-none transition placeholder:text-[#9c9489] focus:bg-[#fffdf7] focus:shadow-[3px_3px_0_#252525]"
                />
                <p className="mt-1 text-right text-[10px] text-[#827b70]">
                  {profileGreeting.length}/100 karakter
                </p>
              </div>

              {profileError && (
                <p className="text-xs font-medium text-red-600">
                  {profileError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                data-sound="none"
                className="w-full rounded-xl border-2 border-[#252525] bg-[#252525] px-4 py-3 text-sm font-bold text-[#FFE69A] shadow-[3px_3px_0_#D9CCFF] hover:bg-[#3b3b3b] disabled:opacity-60"
              >
                {isSavingProfile
                  ? 'Menyimpan...'
                  : 'Simpan perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showNotifications && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
          onClick={() => setShowNotifications(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-title"
            className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-2xl border-2 border-[#252525] bg-[#fffaf1] p-5 shadow-[5px_5px_0_#252525]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#252525] bg-[#FFE69A]">
                  <BellRing size={18} />
                </div>
                <div>
                  <h2
                    id="notification-title"
                    className="text-base font-extrabold"
                  >
                    Pengingat &amp; Notifikasi Hari Ini
                  </h2>
                  <p className="text-[11px] text-[#77716a]">
                    {activeReminderCount > 0
                      ? `${activeReminderCount} pengingat aktif menunggu dituntaskan`
                      : 'Semua pengingat hari ini sudah terkendali'}
                  </p>
                </div>
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

            <div className="space-y-4">
              {overdueReminders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#991B1B]">
                    <AlertTriangle size={14} />
                    <span>Target Terlewat ({overdueReminders.length})</span>
                  </div>

                  {overdueReminders.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border-[1.5px] border-[#252525] bg-[#FEE2E2] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-extrabold text-[#7F1D1D]">
                          {task.title}
                        </p>
                        <span className="shrink-0 rounded-md border border-[#252525] bg-[#FFB5A7] px-2 py-0.5 text-[9px] font-extrabold text-[#252525]">
                          Terlewat
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-semibold text-[#991B1B]">
                        Tenggat: {task.date} • {task.time} WIB ({task.priority})
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#252525]">
                    Target Tugas Hari Ini ({pendingTodayTasks.length})
                  </span>
                  {data.settings.notifications.deadline && (
                    <span className="rounded-full bg-[#D9CCFF] px-2 py-0.5 text-[9px] font-bold text-[#3f3756]">
                      Alarm H-2 Jam Aktif
                    </span>
                  )}
                </div>

                {pendingTodayTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#d8d0c4] bg-white p-3.5 text-center text-xs text-[#77716a]">
                    Tidak ada target tersisa untuk hari ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingTodayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2.5 rounded-xl border-[1.5px] border-[#252525] bg-white p-3"
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FB923C]" />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#252525]">
                            {task.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-[#77716a]">
                            <Clock3 size={11} />
                            <span>{task.time} WIB</span>
                            <span>•</span>
                            <span>{task.category}</span>
                            <span>•</span>
                            <span>{task.priority}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#252525]">
                  <CalendarDays size={14} />
                  <span>
                    Agenda Kalender Hari Ini ({pendingTodayAgenda.length})
                  </span>
                </div>

                {pendingTodayAgenda.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#d8d0c4] bg-white p-3.5 text-center text-xs text-[#77716a]">
                    Tidak ada agenda terjadwal tersisa hari ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingTodayAgenda.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2.5 rounded-xl border-[1.5px] border-[#252525] bg-white p-3"
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#6d28d9]" />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#252525]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-[#77716a]">
                            Pukul {item.time} WIB • {item.category}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#252525]/20 bg-[#fff2d5] p-3 text-[11px] text-[#5c4c2e]">
                <p className="font-extrabold text-[#252525]">
                  Jadwal Pengingat Otomatis:
                </p>
                <p className="mt-1 leading-relaxed">
                  • Pengingat Pagi (07:00 WIB):{' '}
                  <strong>
                    {data.settings.notifications.daily ? 'Aktif' : 'Nonaktif'}
                  </strong>
                  <br />• Refleksi Malam (21:30 WIB):{' '}
                  <strong>
                    {data.settings.notifications.reflection
                      ? 'Aktif'
                      : 'Nonaktif'}
                  </strong>
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(false)
                  navigateToPage('more')
                  setScrollToNotificationsTick((prev) => prev + 1)
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-[#252525] bg-[#D9CCFF] py-2.5 text-xs font-extrabold shadow-[2px_2px_0_#252525]"
              >
                <Settings size={14} />
                Atur Pengingat
              </button>

              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="flex-1 rounded-xl border-[1.5px] border-[#252525] bg-white py-2.5 text-xs font-extrabold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App