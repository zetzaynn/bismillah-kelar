import { Bell } from 'lucide-react'

export const DEFAULT_PROFILE_PHOTO_URL = `${import.meta.env.BASE_URL}coding-cat.png`

interface AppHeaderProps {
  subtitle?: string
  profileName?: string
  profilePhotoUrl?: string | null
  reminderCount?: number
  onProfileClick?: () => void
  onNotificationClick?: () => void
}

export default function AppHeader({
  subtitle,
  profileName,
  profilePhotoUrl,
  reminderCount = 0,
  onProfileClick,
  onNotificationClick,
}: AppHeaderProps) {
  const displayName = profileName?.trim() || 'Profil'
  const avatarSrc = profilePhotoUrl || DEFAULT_PROFILE_PHOTO_URL

  const buttonStyle =
    'border border-[#252525] bg-[#D9CCFF] shadow-[2px_2px_0px_#252525] transition-all duration-150 hover:brightness-[1.03] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'

  return (
    <header className="sticky top-0 z-40 -mx-5 flex items-center justify-between border-b border-[#252525]/15 bg-[#fffaf1]/95 px-5 py-4 backdrop-blur-md">
      <div className="flex min-w-0 flex-col justify-center">
        <span className="block truncate text-lg font-black leading-tight tracking-tight text-[#252525]">
          Bismillah Kelar
        </span>

        {subtitle && (
          <p className="mt-0.5 text-[10px] font-medium leading-tight text-[#827b70]">
            {subtitle}
          </p>
        )}
      </div>

      <div className="ml-2.5 flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="Notifikasi dan pengingat hari ini"
          onClick={onNotificationClick}
          className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-[#252525] ${buttonStyle}`}
        >
          <Bell size={15} strokeWidth={2.4} />

          {reminderCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#252525] bg-[#FFE69A] px-1 text-[9px] font-extrabold leading-none text-[#252525]">
              {reminderCount > 9 ? '9+' : reminderCount}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label={`Profil ${displayName}`}
          onClick={onProfileClick}
          className={`flex h-8 max-w-[108px] items-center gap-1.5 rounded-lg py-0.5 pl-0.5 pr-2.5 text-[#252525] ${buttonStyle}`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#252525] bg-[#fffaf1]">
            <img
              src={avatarSrc}
              alt="Foto profil"
              className="h-full w-full object-cover"
            />
          </span>

          <span className="truncate text-[11px] font-bold">
            {displayName}
          </span>
        </button>
      </div>
    </header>
  )
}