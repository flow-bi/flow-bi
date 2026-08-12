import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'

import { LoginApiError, getSession, logout } from './features/auth/api'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordChangePage } from './features/auth/PasswordChangePage'
import { onUnauthenticated } from './features/authenticatedFetch'
import { ScheduleCalendar } from './features/schedule-calendar/ScheduleCalendar'
import { ScheduleCreateModal } from './features/schedule-create/ScheduleCreateModal'

type Destination = 'login' | 'password-change' | 'home' | 'session-unavailable'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function CalendarStarter() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <>
      <ScheduleCalendar />
      <button
        className="calendar-starter__create schedule-calendar__create"
        onClick={() => setIsCreateOpen(true)}
        type="button"
      >
        일정 추가
      </button>
      {isCreateOpen && <ScheduleCreateModal onClose={() => setIsCreateOpen(false)} />}
    </>
  )
}

type HeaderProps = {
  companyName: string
  userName: string
  onOpenSidebar: () => void
  openSidebarButtonRef: RefObject<HTMLButtonElement | null>
}

function Header({ companyName, userName, onOpenSidebar, openSidebarButtonRef }: HeaderProps) {
  return (
    <header className="app-header">
      <button
        aria-label="사이드바 열기"
        className="bordered-button sidebar-trigger"
        onClick={onOpenSidebar}
        ref={openSidebarButtonRef}
        type="button"
      >
        메뉴
      </button>
      <p className="company-name">{companyName}</p>
      <p className="user-name">{userName}</p>
    </header>
  )
}

type SidebarProps = {
  children: ReactNode
}

function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="sidebar">
      <nav aria-label="주요 탐색">
        <h2 className="sidebar-heading">주요 탐색</h2>
        {children}
      </nav>
    </aside>
  )
}

type MobileSidebarProps = SidebarProps & {
  onClose: () => void
}

function MobileSidebar({ children, onClose }: MobileSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  return (
    <div className="sidebar-backdrop" onClick={onClose}>
      <aside
        aria-label="주요 탐색"
        aria-modal="true"
        className="mobile-sidebar"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose()
          }
        }}
        role="dialog"
      >
        <div className="mobile-sidebar-header">
          <h2>주요 탐색</h2>
          <button
            aria-label="사이드바 닫기"
            className="bordered-button"
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
  sidebar: ReactNode
  children: ReactNode
}

function AppShell({ sidebar, children }: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const openSidebarButtonRef = useRef<HTMLButtonElement>(null)

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
    openSidebarButtonRef.current?.focus()
  }

  return (
    // todo: 인증인가 이후, 회사명과 사용자명을 props로 전달받도록 수정

    <div className="app-shell">
      <Header
        companyName="Flow BI"
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        openSidebarButtonRef={openSidebarButtonRef}
        userName="김유선"
      />
      <div className="app-body">
        <Sidebar>{sidebar}</Sidebar>
        <main aria-label="콘텐츠" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      {isMobileSidebarOpen ? (
        <MobileSidebar onClose={closeMobileSidebar}>{sidebar}</MobileSidebar>
      ) : null}
    </div>
  )
}

function App() {
  const [destination, setDestination] = useState<Destination>()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isCalendarRoute = new URLSearchParams(window.location.search).has('view')

  useEffect(() => {
    return onUnauthenticated(() => {
      queryClient.clear()
      setDestination('login')
    })
  }, [])

  useEffect(() => {
    void getSession()
      .then(({ mustChangePassword }) =>
        setDestination(mustChangePassword ? 'password-change' : 'home'),
      )
      .catch((error: unknown) =>
        setDestination(
          error instanceof LoginApiError && error.status === 503 ? 'session-unavailable' : 'login',
        ),
      )
  }, [])

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setDestination('login')
      setIsLoggingOut(false)
    }
  }

  let content: ReactNode
  if (destination === undefined) {
    content = <p aria-busy="true">인증 상태를 확인하고 있습니다.</p>
  } else if (destination === 'password-change') {
    content = (
      <PasswordChangePage
        onCompleted={() => setDestination('home')}
        onSessionExpired={() => setDestination('login')}
      />
    )
  } else if (destination === 'home') {
    content = (
      <QueryClientProvider client={queryClient}>
        <h1>Flow BI</h1>
        <p>로그인되었습니다.</p>
        <button disabled={isLoggingOut} onClick={() => void handleLogout()} type="button">
          {isLoggingOut ? '로그아웃 중' : '로그아웃'}
        </button>
        {isCalendarRoute && <CalendarStarter />}
      </QueryClientProvider>
    )
  } else if (destination === 'session-unavailable') {
    content = (
      <>
        <h1>인증 상태를 확인할 수 없습니다</h1>
        <p>잠시 후 페이지를 새로고침해 주세요.</p>
      </>
    )
  } else {
    content = (
      <LoginPage
        onAuthenticated={({ mustChangePassword }) =>
          setDestination(mustChangePassword ? 'password-change' : 'home')
        }
      />
    )
  }

  return (
    <AppShell sidebar={<p className="sidebar-placeholder">메뉴는 준비 중입니다.</p>}>
      <h1>콘텐츠</h1>
      {content}
    </AppShell>
  )
}

export default App
