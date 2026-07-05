import { navigateTo } from '../../../app/routes/navigation'
import { protectedRoutes } from '../../../app/routes/routeConfig'
import { useLogoutMutation } from '../../../features/auth/hooks'

type SidebarProps = {
  activePath: string
  onNavigate?: () => void
}

export function Sidebar({ activePath, onNavigate }: SidebarProps) {
  const logoutMutation = useLogoutMutation()

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <nav className="flex-1 px-3 py-4" aria-label="주요 메뉴">
        <ul className="space-y-1">
          {protectedRoutes.map((route) => {
            const isActive = route.path === activePath
            return (
              <li key={route.path}>
                <a
                  className={`relative flex min-h-10 items-center rounded-md px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
                    isActive
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                  } ${route.status === 'design-only' ? 'opacity-70' : ''}`}
                  href={route.path}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    navigateTo(route.path)
                    onNavigate?.()
                  }}
                >
                  {isActive ? (
                    <span
                      className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-[var(--color-primary)]"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>{route.label}</span>
                  {route.status === 'design-only' ? (
                    <span className="ml-auto rounded-sm border border-[var(--color-border)] px-1.5 py-0.5 text-xs font-normal text-[var(--color-text-muted)]">
                      준비 중
                    </span>
                  ) : null}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <button
          className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-60"
          disabled={logoutMutation.isPending}
          type="button"
          onClick={() => logoutMutation.mutate()}
        >
          로그아웃
        </button>
      </div>
    </aside>
  )
}
