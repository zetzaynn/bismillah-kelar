
import { Bell, UserCircle } from 'lucide-react'

interface AppHeaderProps {
  subtitle?: string
}

export default function AppHeader({ subtitle }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#252525]">
            Bismillah Kelar
          </span>
          <span className="rounded-full bg-[#e9e4d9] px-2 py-0.5 text-[9px] font-bold text-[#716b60]">
            LOKAL
          </span>
        </div>

        {subtitle && (
          <p className="mt-0.5 text-[10px] text-[#827b70]">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          aria-label="Notifikasi"
          className="rounded-full p-1.5 hover:bg-[#f1eadf]"
        >
          <Bell size={17} />
        </button>

        <button
          aria-label="Profil Zayy"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#252525] text-white"
        >
          <UserCircle size={18} />
        </button>
      </div>
    </header>
  )
}
