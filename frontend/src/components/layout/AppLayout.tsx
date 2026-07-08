import { adminRoutes, navRoutes, themeRoute, type AppPath } from '@/app/routes'

import type { AuthUser } from '@/pages/login/types/auth'
import type { ReactNode } from 'react'

type AppLayoutProps = {
  activePath: AppPath
  children: ReactNode
  title: string
  user: AuthUser
  onLogout: () => void
  onNavigate: (path: AppPath) => void
}

function isActiveRoute(activePath: AppPath, path: AppPath) {
  if (path === '/admin') {
    return activePath === '/admin' || activePath === '/admin/users' || activePath === '/admin/teams'
  }

  return activePath === path
}

export function AppLayout({
  activePath,
  children,
  onLogout,
  onNavigate,
  title,
  user,
}: AppLayoutProps) {
  const isAdmin = user.roles.includes('ADMIN')
  const visibleRoutes = navRoutes.filter((route) => !route.adminOnly || isAdmin)

  return (
    <div className="app-layout">
      <aside className="app-sidebar" aria-label="주요 메뉴">
        <div className="sidebar-brand">
          <div className="brand-symbol" aria-hidden="true">
            AI
          </div>
          <div>
            <strong>AI Groupware</strong>
            <span>{user.team}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="사이드바">
          {visibleRoutes.map((route) => (
            <button
              className={isActiveRoute(activePath, route.path) ? 'nav-item active' : 'nav-item'}
              key={route.path}
              type="button"
              onClick={() => {
                onNavigate(route.path)
              }}
            >
              {route.label}
            </button>
          ))}
        </nav>

        {isAdmin ? (
          <div className="sidebar-group">
            <span>관리자</span>
            {adminRoutes.map((route) => (
              <button
                className={
                  activePath === route.path ? 'nav-item compact active' : 'nav-item compact'
                }
                key={route.path}
                type="button"
                onClick={() => {
                  onNavigate(route.path)
                }}
              >
                {route.label}
              </button>
            ))}
          </div>
        ) : null}

        <button
          className={activePath === themeRoute.path ? 'nav-item active' : 'nav-item'}
          type="button"
          onClick={() => {
            onNavigate(themeRoute.path)
          }}
        >
          {themeRoute.label}
        </button>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="section-label">Workspace</p>
            <h1>{title}</h1>
          </div>

          <div className="user-menu">
            <div className="avatar" aria-hidden="true">
              {user.name.slice(0, 1)}
            </div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.position}</span>
            </div>
            <button className="secondary-button" type="button" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
