import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import {
  getSession,
  LoginApiError,
  logout,
  type LoginResult,
  type SessionResult,
} from './features/auth/api'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordChangePage } from './features/auth/PasswordChangePage'
import { onUnauthenticated } from './features/authenticatedFetch'
import { CurrentUserName } from './features/current-user'
import {
  MeetingRoomPage,
  resolveMeetingRoomGateway,
  type MeetingRoomGateway,
} from './features/meeting-room'
import { OrganizationChart } from './features/organization-chart'
import { ScheduleCalendar, ScheduleCreateModal } from './features/schedule-calendar'

declare global {
  interface Window {
    __FLOW_BI_MEETING_ROOM_GATEWAY__?: MeetingRoomGateway
    __FLOW_BI_MEETING_ROOM_TEST_HARNESS__?: boolean
  }
}

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
  onOpenSidebar: () => void
  openSidebarButtonRef: RefObject<HTMLButtonElement | null>
}

function Header({
  companyName,
  isMobileSidebarOpen,
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
      <p className="m-0 justify-self-end text-text-secondary">
        <CurrentUserName />
      </p>
    </header>
  )
}

type SidebarProps = { children: ReactNode; logout: ReactNode }

function Sidebar({ children, logout }: SidebarProps) {
  return (
    <aside
      className="hidden flex-col border-r border-border bg-surface p-6 md:flex"
      data-desktop-sidebar
      data-testid="desktop-sidebar"
    >
      <nav aria-label="주요 탐색">{children}</nav>
      <div className="mt-auto pt-6">{logout}</div>
    </aside>
  )
}

type MobileSidebarProps = SidebarProps & { onClose: () => void }

function MobileSidebar({ children, logout, onClose }: MobileSidebarProps) {
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
        className="flex min-h-full w-[min(20rem,85vw)] flex-col bg-surface p-5 shadow-[0_0_1.5rem_color-mix(in_srgb,var(--color-text-primary)_20%,transparent)]"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose()
          }
        }}
        role="dialog"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
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
        <div className="mt-auto pt-6">{logout}</div>
      </aside>
    </div>
  )
}

type AppShellProps = {
  sidebar: (onNavigate: () => void) => ReactNode
  logout: ReactNode
  children: ReactNode
}

function isMeetingRoomTestHarness(): boolean {
  return import.meta.env.DEV && window.__FLOW_BI_MEETING_ROOM_TEST_HARNESS__ === true
}

function AppShell({ sidebar, logout, children }: AppShellProps) {
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
    <div className="min-h-screen bg-background text-text-primary">
      <Header
        companyName="Flow BI"
        isMobileSidebarOpen={isMobileSidebarOpen}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        openSidebarButtonRef={openSidebarButtonRef}
      />
      <div
        className="min-h-[calc(100vh-4rem)] md:grid md:grid-cols-[16rem_minmax(0,1fr)]"
        data-app-body
      >
        <Sidebar logout={logout}>{sidebar(() => undefined)}</Sidebar>
        <main
          aria-label="콘텐츠"
          className="bg-background p-4 md:p-8 [&>h1]:mt-0 [&>p]:text-text-secondary"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      {isMobileSidebarOpen ? (
        <MobileSidebar logout={logout} onClose={closeMobileSidebar}>
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
  queryClient: QueryClient
}

function logoutErrorMessage(error: unknown): string {
  if (error instanceof LoginApiError && error.status === 403) {
    return '요청을 확인할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
  }
  return '로그아웃할 수 없습니다. 잠시 후 다시 시도해 주세요.'
}

function AuthenticatedApp({ onLoggedOut, queryClient }: AuthenticatedAppProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string>()
  const [locationSearch, setLocationSearch] = useState(() => window.location.search)
  const isCalendarRoute = new URLSearchParams(locationSearch).has('view')
  const isOrganizationChartRoute = new URLSearchParams(locationSearch).has('organization-chart')
  const isTestHarness = isMeetingRoomTestHarness()
  const meetingRoomGateway = resolveMeetingRoomGateway({
    isTestHarness,
    injectedGateway: isTestHarness ? window.__FLOW_BI_MEETING_ROOM_GATEWAY__ : undefined,
  })

  const navigateToMeetingRoom = () => {
    window.history.pushState({}, '', window.location.pathname)
    setLocationSearch('')
  }

  const navigateToCalendar = () => {
    const calendarSearch = '?view=month'
    window.history.pushState({}, '', `${window.location.pathname}${calendarSearch}`)
    setLocationSearch(calendarSearch)
  }

  const navigateToOrganizationChart = () => {
    const organizationChartSearch = '?organization-chart'
    window.history.pushState({}, '', `${window.location.pathname}${organizationChartSearch}`)
    setLocationSearch(organizationChartSearch)
  }

  useEffect(() => {
    const updateLocation = () => setLocationSearch(window.location.search)
    window.addEventListener('popstate', updateLocation)
    return () => window.removeEventListener('popstate', updateLocation)
  }, [])

  async function handleLogout() {
    setLogoutError(undefined)
    setIsLoggingOut(true)
    try {
      await logout()
      queryClient.clear()
      onLoggedOut()
    } catch (error: unknown) {
      if (error instanceof LoginApiError && error.status === 401) {
        queryClient.clear()
        onLoggedOut()
        return
      }
      setLogoutError(logoutErrorMessage(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navigationClass = (isCurrent: boolean) =>
    isCurrent
      ? 'flex items-center justify-between gap-2 rounded-md border-l-4 border-primary bg-secondary px-3 py-2.5 font-bold text-text-primary no-underline hover:bg-secondary [&>span]:text-xs [&>span]:font-normal [&>span]:text-text-secondary'
      : 'flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-text-primary no-underline hover:bg-secondary'

  const sidebar = (onNavigate: () => void) => (
    <div className="flex flex-col gap-1">
      <a
        aria-current={!isCalendarRoute && !isOrganizationChartRoute ? 'page' : undefined}
        aria-label="회의실"
        className={navigationClass(!isCalendarRoute && !isOrganizationChartRoute)}
        href="#meeting-room"
        onClick={(event) => {
          event.preventDefault()
          navigateToMeetingRoom()
          onNavigate()
        }}
      >
        회의실
        {!isCalendarRoute && !isOrganizationChartRoute && <span aria-hidden="true" />}
      </a>
      <a
        aria-current={isCalendarRoute ? 'page' : undefined}
        aria-label="캘린더"
        className={navigationClass(isCalendarRoute)}
        href="?view=month"
        onClick={(event) => {
          event.preventDefault()
          navigateToCalendar()
          onNavigate()
        }}
      >
        캘린더
        {isCalendarRoute && <span aria-hidden="true" />}
      </a>
      <a
        aria-current={isOrganizationChartRoute ? 'page' : undefined}
        aria-label="조직도"
        className={navigationClass(isOrganizationChartRoute)}
        href="?organization-chart"
        onClick={(event) => {
          event.preventDefault()
          navigateToOrganizationChart()
          onNavigate()
        }}
      >
        조직도
        {isOrganizationChartRoute && <span aria-hidden="true" />}
      </a>
    </div>
  )

  const logoutButton = (
    <>
      {logoutError !== undefined ? (
        <p aria-live="assertive" className="mb-3 text-sm text-danger" role="alert">
          {logoutError}
        </p>
      ) : null}
      <button
        aria-label={isLoggingOut ? '로그아웃 중' : '로그아웃'}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-text-primary transition hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70"
        disabled={isLoggingOut}
        onClick={() => void handleLogout()}
        type="button"
      >
        {isLoggingOut ? '로그아웃 중' : '로그아웃'}
      </button>
    </>
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell logout={logoutButton} sidebar={sidebar}>
        {isOrganizationChartRoute ? (
          <OrganizationChart />
        ) : isCalendarRoute ? (
          <CalendarStarter />
        ) : (
          <MeetingRoomPage gateway={meetingRoomGateway} />
        )}
      </AppShell>
    </QueryClientProvider>
  )
}

function App() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  const [authentication, setAuthentication] = useState<AuthenticationState>({ kind: 'loading' })

  const onSessionExpired = useCallback(() => {
    queryClient.clear()
    setAuthentication({ kind: 'anonymous' })
    navigate('/login', true)
  }, [queryClient])

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

  return <AuthenticatedApp onLoggedOut={onSessionExpired} queryClient={queryClient} />
}

export default App
