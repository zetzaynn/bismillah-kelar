
import { useEffect, useRef, useState } from 'react'
import BottomNav, {
  type PageType,
} from './components/layout/BottomNav'
import AppHeader from './components/layout/AppHeader'

import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Progress from './pages/Progress'
import More from './pages/More'

const INTERACTION_SOUND_KEY = 'bismillah-kelar-interaction-sound'

const pageTitles: Record<PageType, string> = {
  today: 'Dashboard personal Zayy',
  tasks: 'Manajemen tugas',
  calendar: 'Agenda dan jadwal',
  progress: 'Perkembangan produktivitas',
  more: 'Pengaturan aplikasi',
}

function App() {
  const [activePage, setActivePage] =
    useState<PageType>('today')

  const audioContextRef = useRef<AudioContext | null>(null)

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

        // Volume interaksi dinaikkan agar lebih terdengar
        gain.gain.setValueAtTime(0.0001, now)

        gain.gain.exponentialRampToValueAtTime(
          1.00,
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
        return <More />
      default:
        return <Today />
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f2e9] text-[#252525]">
      <main className="mx-auto min-h-screen w-full max-w-[480px] bg-[#fffaf1] px-5 pb-28 pt-5">
        <AppHeader subtitle={pageTitles[activePage]} />

        <section className="mt-6">
          {renderPage()}
        </section>
      </main>

      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
      />
    </div>
  )
}

export default App
