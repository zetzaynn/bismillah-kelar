
import { Bell, UserCircle } from 'lucide-react'

interface AppHeaderProps {
  subtitle?: string
  profileName?: string
  profilePhotoUrl?: string | null
  onProfileClick?: () => void
  onNotificationClick?: () => void
}

export default function AppHeader({
  subtitle,
  profileName,
  profilePhotoUrl,
  onProfileClick,
  onNotificationClick,
}: AppHeaderProps) {
  const displayName = profileName?.trim() || 'Profil'

  const buttonStyle =
    'border border-[#252525] bg-[#D9CCFF] shadow-[2px_2px_0px_#252525] transition-all duration-150 hover:brightness-[1.03] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'

  return (
    <header className="sticky top-0 z-40 -mx-5 flex items-center justify-between border-b border-[#252525]/15 bg-[#fffaf1]/95 px-5 py-3 backdrop-blur-md">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#252525]">
            Bismillah Kelar
          </span>

          <span className="rounded-full border border-[#252525] bg-[#e9e4d9] px-2 py-0.5 text-[9px] font-bold text-[#716b60]">
            LOKAL
          </span>
        </div>

        {subtitle && (
          <p className="mt-0.5 text-[10px] text-[#827b70]">
            {subtitle}
          </p>
        )}
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Notifikasi"
          onClick={onNotificationClick}
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-[#252525] ${buttonStyle}`}
        >
          <Bell size={18} strokeWidth={2.3} />
        </button>

        <button
          type="button"
          aria-label={`Profil ${displayName}`}
          onClick={onProfileClick}
          className={`flex max-w-[130px] items-center gap-2 rounded-xl py-1 pl-1 pr-3 text-[#252525] ${buttonStyle}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#252525] bg-[#c5adff] text-[#252525]">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt="Foto profil"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle size={19} strokeWidth={2.2} />
            )}
          </span>

          <span className="truncate text-xs font-bold">
            {displayName}
          </span>
        </button>
      </div>
    </header>
  )
}
