
import {
  Sun,
  CheckCircle2,
  CalendarDays,
  ChartNoAxesCombined,
  MoreHorizontal,
} from 'lucide-react'

export type PageType =
  | 'today'
  | 'tasks'
  | 'calendar'
  | 'progress'
  | 'more'

interface BottomNavProps {
  activePage: PageType
  onNavigate: (page: PageType) => void
}

const navigationItems = [
  { id: 'today', label: 'Hari Ini', icon: Sun },
  { id: 'tasks', label: 'Target', icon: CheckCircle2 },
  { id: 'calendar', label: 'Kalender', icon: CalendarDays },
  { id: 'progress', label: 'Progres', icon: ChartNoAxesCombined },
  { id: 'more', label: 'Lainnya', icon: MoreHorizontal },
] as const

export default function BottomNav({
  activePage,
  onNavigate,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-[#e9e1d5] bg-[#fffaf1]">
      <div className="mx-auto flex max-w-[480px] items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = activePage === item.id

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-all ${
                active
                  ? 'bg-[#ffe69a] text-[#252525] shadow-[2px_2px_0_#252525]'
                  : 'text-[#77716a] hover:bg-[#f4eee4]'
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
