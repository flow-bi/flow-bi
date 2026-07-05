import { navigateTo } from '../../../app/routes/navigation'
import { useAuthStore } from '../../../features/auth/store'

type HeaderProps = {
  onOpenSidebar: () => void
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const user = useAuthStore((state) => state.user)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[var(--color-text)] md:px-6">
      <button
        className="mr-3 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 md:hidden"
        type="button"
        aria-label="사이드바 열기"
        onClick={onOpenSidebar}
      >
        <span className="flex w-4 flex-col gap-1" aria-hidden="true">
          <span className="h-0.5 rounded-full bg-current" />
          <span className="h-0.5 rounded-full bg-current" />
          <span className="h-0.5 rounded-full bg-current" />
        </span>
      </button>

      <a
        className="text-[18px] font-semibold"
        href="/dashboard"
        onClick={(event) => {
          event.preventDefault()
          navigateTo('/dashboard')
        }}
      >
        Flow BI
      </a>

      <div className="ml-auto flex items-center gap-4">
        <label className="hidden md:block">
          <span className="sr-only">검색</span>
          <input
            className="h-9 w-56 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-muted)]"
            disabled
            placeholder="검색 준비 중"
            type="search"
          />
        </label>
        <div className="text-right">
          <p className="text-sm font-semibold">{user?.name ?? '사용자'}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{user?.employeeNumber ?? ''}</p>
        </div>
      </div>
    </header>
  )
}
