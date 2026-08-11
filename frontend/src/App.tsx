import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'

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
    <div className="app-shell">
      // todo: 인증인가 이후, 회사명과 사용자명을 props로 전달받도록 수정
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
  return (
    <AppShell sidebar={<p className="sidebar-placeholder">메뉴는 준비 중입니다.</p>}>
      <h1>콘텐츠</h1>
      <p>후속 화면의 콘텐츠가 이 영역에 표시됩니다.</p>
    </AppShell>
  )
}

export default App
