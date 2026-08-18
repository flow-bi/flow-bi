import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import { getSession, logout, type LoginResult, type SessionResult } from './features/auth/api'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordChangePage } from './features/auth/PasswordChangePage'
import { onUnauthenticated } from './features/authenticatedFetch'
import { ScheduleCalendar } from './features/schedule-calendar/ScheduleCalendar'
import { ScheduleCreateModal } from './features/schedule-create/ScheduleCreateModal'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function CalendarStarter() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <>
      <ScheduleCalendar onCreateSchedule={() => setIsCreateOpen(true)} />
      {isCreateOpen && <ScheduleCreateModal onClose={() => setIsCreateOpen(false)} />}
    </>
  )
}

type HeaderProps = {
  companyName: string
  isMobileSidebarOpen: boolean
  userName: string
  onOpenSidebar: () => void
  openSidebarButtonRef: RefObject<HTMLButtonElement | null>
}

function Header({
  companyName,
  isMobileSidebarOpen,
  userName,
  onOpenSidebar,
  openSidebarButtonRef,
}: HeaderProps) {
  return (
    <header
      className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center border-b border-border bg-surface px-4 py-3 md:px-6"
      data-app-header
    >
      <button
        aria-expanded={isMobileSidebarOpen}
        aria-label="사이드바 열기"
        className="mr-3 rounded-md border border-border bg-surface px-2.5 py-1.5 text-text-primary md:hidden"
        onClick={onOpenSidebar}
        ref={openSidebarButtonRef}
        type="button"
      >
        메뉴
      </button>
      <h1 className="m-0 justify-self-start font-bold">{companyName}</h1>
      <p className="m-0 justify-self-end text-text-secondary">{userName}</p>
    </header>
  )
}

type SidebarProps = { children: ReactNode }

function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="hidden border-r border-border bg-surface p-6 md:block" data-desktop-sidebar>
      <nav aria-label="주요 탐색">
        <h2 className="mt-0 text-base">주요 탐색</h2>
        {children}
      </nav>
    </aside>
  )
}

type MobileSidebarProps = SidebarProps & { onClose: () => void }

function MobileSidebar({ children, onClose }: MobileSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])
  return (
    <div
      className="fixed inset-0 z-10 flex bg-text-primary/35 md:hidden"
      data-mobile-sidebar-backdrop
      onClick={onClose}
    >
      <aside
        aria-label="주요 탐색"
        aria-modal="true"
        className="min-h-full w-[min(20rem,85vw)] bg-surface p-5 shadow-[0_0_1.5rem_color-mix(in_srgb,var(--color-text-primary)_20%,transparent)]"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose()
          }
        }}
        role="dialog"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2>주요 탐색</h2>
          <button
            aria-label="사이드바 닫기"
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-text-primary"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            닫기
          </button>
        </div>
        <nav aria-label="주요 탐색">{children}</nav>
      </aside>
    </div>
  )
}

type AppShellProps = {
  sidebar: (onNavigate: () => void) => ReactNode
  children: ReactNode
}

function AppShell({ sidebar, children }: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const openSidebarButtonRef = useRef<HTMLButtonElement>(null)
  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
    openSidebarButtonRef.current?.focus()
  }

  const closeMobileSidebarAfterNavigation = () => {
    setIsMobileSidebarOpen(false)
  }

  return (
    // todo: 인증인가 이후, 회사명과 사용자명을 props로 전달받도록 수정

    <div className="min-h-screen bg-background text-text-primary">
      <Header
        companyName="Flow BI"
        isMobileSidebarOpen={isMobileSidebarOpen}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        openSidebarButtonRef={openSidebarButtonRef}
        userName="김유선"
      />
      <div
        className="min-h-[calc(100vh-4rem)] md:grid md:grid-cols-[16rem_minmax(0,1fr)]"
        data-app-body
      >
        <Sidebar>{sidebar(() => undefined)}</Sidebar>
        <main
          aria-label="콘텐츠"
          className="bg-background p-4 md:p-8 [&>h1]:mt-0 [&>p]:text-text-secondary"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      {isMobileSidebarOpen ? (
        <MobileSidebar onClose={closeMobileSidebar}>
          {sidebar(closeMobileSidebarAfterNavigation)}
        </MobileSidebar>
      ) : null}
    </div>
  )
}

type AuthenticationState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; session: SessionResult }
type AllowedPath = '/' | '/login' | '/password-change'

function allowedPath(session: SessionResult | undefined): AllowedPath {
  if (session === undefined) {
    return '/login'
  }
  return session.mustChangePassword ? '/password-change' : '/'
}

function currentPath(): string {
  return window.location.pathname
}

function navigate(path: AllowedPath, replace = false) {
  if (currentPath() !== path) {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
  }
}

type AuthenticatedAppProps = {
  onLoggedOut: () => void
}

function AuthenticatedApp({ onLoggedOut }: AuthenticatedAppProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [locationSearch, setLocationSearch] = useState(() => window.location.search)
  const mainHeadingRef = useRef<HTMLHeadingElement>(null)
  const isCalendarRoute = new URLSearchParams(locationSearch).has('view')

  const navigateToCalendar = () => {
    const calendarSearch = '?view=month'
    window.history.pushState({}, '', `${window.location.pathname}${calendarSearch}`)
    setLocationSearch(calendarSearch)
  }

  useEffect(() => {
    mainHeadingRef.current?.focus()
  }, [])

  useEffect(() => {
    const updateLocation = () => setLocationSearch(window.location.search)
    window.addEventListener('popstate', updateLocation)
    return () => window.removeEventListener('popstate', updateLocation)
  }, [])

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      queryClient.clear()
      onLoggedOut()
    } finally {
      setIsLoggingOut(false)
    }
  }

  const sidebar = (onNavigate: () => void) => (
    <a
      aria-current={isCalendarRoute ? 'page' : undefined}
      aria-label="캘린더"
      className={
        isCalendarRoute
          ? 'flex items-center justify-between gap-2 rounded-md border-l-4 border-primary bg-secondary px-3 py-2.5 font-bold text-text-primary no-underline hover:bg-secondary [&>span]:text-xs [&>span]:font-normal [&>span]:text-text-secondary'
          : 'flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-text-primary no-underline hover:bg-secondary'
      }
      href="?view=month"
      onClick={(event) => {
        event.preventDefault()
        navigateToCalendar()
        onNavigate()
      }}
    >
      캘린더
      {isCalendarRoute && <span aria-hidden="true">현재 위치</span>}
    </a>
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell sidebar={sidebar}>
        <h1 ref={mainHeadingRef} tabIndex={-1}>
          콘텐츠
        </h1>
        <p>로그인되었습니다.</p>
        <button disabled={isLoggingOut} onClick={() => void handleLogout()} type="button">
          {isLoggingOut ? '로그아웃 중' : '로그아웃'}
        </button>
        {isCalendarRoute && <CalendarStarter />}
      </AppShell>
    </QueryClientProvider>
  )
}

function App() {
  const [authentication, setAuthentication] = useState<AuthenticationState>({ kind: 'loading' })

  const onSessionExpired = useCallback(() => {
    queryClient.clear()
    setAuthentication({ kind: 'anonymous' })
    navigate('/login', true)
  }, [])

  const bootstrap = useCallback(async () => {
    setAuthentication({ kind: 'loading' })
    try {
      const session = await getSession()
      setAuthentication({ kind: 'authenticated', session })
      navigate(allowedPath(session), true)
    } catch (error: unknown) {
      const status = error instanceof Error && 'status' in error ? error.status : undefined
      if (status === 401) {
        setAuthentication({ kind: 'anonymous' })
        navigate('/login', true)
        return
      }
      setAuthentication({ kind: 'error' })
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(bootstrap)
  }, [bootstrap])
  useEffect(() => onUnauthenticated(onSessionExpired), [onSessionExpired])
  useEffect(() => {
    const onPopState = () => {
      window.setTimeout(() => {
        void bootstrap()
      }, 0)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [bootstrap])
  const onAuthenticated = (result: LoginResult) => {
    const session: SessionResult = {
      authenticated: true,
      mustChangePassword: result.mustChangePassword,
    }
    setAuthentication({ kind: 'authenticated', session })
    navigate(allowedPath(session))
  }
  const onPasswordCompleted = () => {
    setAuthentication({
      kind: 'authenticated',
      session: { authenticated: true, mustChangePassword: false },
    })
    navigate('/')
  }
  if (authentication.kind === 'loading') {
    return (
      <main aria-busy="true" aria-live="polite" className="auth-status">
        <h1 tabIndex={-1}>인증 상태를 확인하는 중입니다</h1>
      </main>
    )
  }
  if (authentication.kind === 'error') {
    return (
      <main aria-live="assertive" className="auth-status">
        <h1 tabIndex={-1}>인증 상태를 확인할 수 없습니다</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <button autoFocus onClick={() => void bootstrap()} type="button">
          다시 시도
        </button>
      </main>
    )
  }
  if (authentication.kind === 'anonymous') {
    return <LoginPage onAuthenticated={onAuthenticated} />
  }
  if (authentication.session.mustChangePassword) {
    return (
      <PasswordChangePage
        logout={logout}
        onCompleted={onPasswordCompleted}
        onLoggedOut={onSessionExpired}
        onSessionExpired={onSessionExpired}
      />
    )
  }

  return <AuthenticatedApp onLoggedOut={onSessionExpired} />
}

export default App
