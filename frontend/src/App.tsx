import { useEffect, useState } from 'react'

import { getRouteTitle, normalizePath, type AppPath } from '@/app/routes'
import { AppLayout } from '@/components/layout/AppLayout'
import AdminHomePage from '@/pages/admin/AdminHomePage'
import AdminTeamsPage from '@/pages/admin/AdminTeamsPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AiChatPage from '@/pages/aiChat/AiChatPage'
import CalendarPage from '@/pages/calendar/CalendarPage'
import ChangePasswordPage from '@/pages/changePassword/ChangePasswordPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import LoginPage from '@/pages/login/LoginPage'
import MyPage from '@/pages/mypage/MyPage'
import OrganizationPage from '@/pages/organization/OrganizationPage'
import RoomsPage from '@/pages/rooms/RoomsPage'
import ThemePage from '@/pages/theme/ThemePage'

import type { AuthUser } from '@/pages/login/types/auth'

const publicPaths: AppPath[] = ['/login', '/change-password']

function App() {
  const [path, setPath] = useState<AppPath>(() => normalizePath(window.location.pathname))
  const [user, setUser] = useState<AuthUser | null>(null)

  const navigate = (nextPath: AppPath) => {
    const normalizedPath = nextPath === '/' ? '/dashboard' : nextPath

    window.history.pushState(null, '', normalizedPath)
    setPath(normalizedPath)
  }

  useEffect(() => {
    const handlePopState = () => {
      setPath(normalizePath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  if (!user && !publicPaths.includes(path)) {
    return (
      <LoginPage
        onLogin={(loggedInUser) => {
          setUser(loggedInUser)
          navigate('/dashboard')
        }}
      />
    )
  }

  if (path === '/change-password') {
    return <ChangePasswordPage />
  }

  if (!user || path === '/login') {
    return (
      <LoginPage
        onLogin={(loggedInUser) => {
          setUser(loggedInUser)
          navigate('/dashboard')
        }}
      />
    )
  }

  const renderPage = () => {
    if (path === '/ai-chat') {
      return <AiChatPage />
    }

    if (path === '/calendar') {
      return <CalendarPage />
    }

    if (path === '/organization') {
      return <OrganizationPage />
    }

    if (path === '/rooms') {
      return <RoomsPage />
    }

    if (path === '/mypage') {
      return <MyPage user={user} />
    }

    if (path === '/settings/theme') {
      return <ThemePage />
    }

    if (path === '/admin/users') {
      return <AdminUsersPage />
    }

    if (path === '/admin/teams') {
      return <AdminTeamsPage />
    }

    if (path === '/admin') {
      return <AdminHomePage />
    }

    return <DashboardPage />
  }

  return (
    <AppLayout
      activePath={path}
      title={getRouteTitle(path)}
      user={user}
      onLogout={() => {
        setUser(null)
        navigate('/login')
      }}
      onNavigate={navigate}
    >
      {renderPage()}
    </AppLayout>
  )
}

export default App
