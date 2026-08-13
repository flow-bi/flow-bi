import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import { getSession, logout, type LoginResult, type SessionResult } from './features/auth/api'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordChangePage } from './features/auth/PasswordChangePage'

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
      <h1 className="company-name">{companyName}</h1>
      <p className="user-name">{userName}</p>
    </header>
  )
}

type SidebarProps = { children: ReactNode }

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

type MobileSidebarProps = SidebarProps & { onClose: () => void }

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

type AppShellProps = { sidebar: ReactNode; children: ReactNode }

function AppShell({ sidebar, children }: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const openSidebarButtonRef = useRef<HTMLButtonElement>(null)
  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
    openSidebarButtonRef.current?.focus()
  }
  return (
    <div className="app-shell">
      <Header
        companyName="Flow BI"
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        openSidebarButtonRef={openSidebarButtonRef}
        userName="김지선"
      />
      <div className="app-body">
        <Sidebar>{sidebar}</Sidebar>
        <main aria-label="콘텐츠" className="main-content">
          {children}
        </main>
      </div>
      {isMobileSidebarOpen ? (
        <MobileSidebar onClose={closeMobileSidebar}>{sidebar}</MobileSidebar>
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

function App() {
  const [authentication, setAuthentication] = useState<AuthenticationState>({ kind: 'loading' })
  const mainHeadingRef = useRef<HTMLHeadingElement>(null)

  const navigate = (path: AllowedPath, replace = false) => {
    if (currentPath() !== path) {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
    }
  }

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
    const timer = window.setTimeout(() => {
      void bootstrap()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [bootstrap])
  useEffect(() => {
    const onPopState = () => {
      window.setTimeout(() => {
        void bootstrap()
      }, 0)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [bootstrap])
  useEffect(() => {
    if (authentication.kind === 'authenticated' && !authentication.session.mustChangePassword) {
      mainHeadingRef.current?.focus()
    }
  }, [authentication])

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
  const onSessionExpired = () => {
    setAuthentication({ kind: 'anonymous' })
    navigate('/login', true)
  }
  const onLogout = async () => {
    await logout()
    onSessionExpired()
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

  return (
    <AppShell sidebar={<p className="sidebar-placeholder">메뉴를 준비 중입니다.</p>}>
      <h1 ref={mainHeadingRef} tabIndex={-1}>
        콘텐츠
      </h1>
      <p>현재 화면의 콘텐츠가 이 영역에 표시됩니다.</p>
      <button className="bordered-button" onClick={() => void onLogout()} type="button">
        로그아웃
      </button>
    </AppShell>
  )
}

export default App
