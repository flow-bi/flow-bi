import { useEffect, useMemo } from 'react'

import { navigateTo } from './navigation'
import { defaultAuthenticatedPath, findProtectedRoute } from './routeConfig'
import { useCurrentPath } from './useCurrentPath'
import { LoginPage } from '../../features/auth/components/LoginPage'
import { useAuthStore } from '../../features/auth/store'
import { CalendarPage } from '../../features/schedule/calendar/components/CalendarPage'
import { DashboardPage } from '../../features/schedule/dashboard-widgets/components/DashboardPage'
import { AppLayout } from '../../shared/components/layout/AppLayout'
import { PlaceholderPage } from '../../shared/components/layout/PlaceholderPage'

export function AppRouter() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const currentPath = useCurrentPath()
  const { pathname, searchParams } = useMemo(() => parseCurrentPath(currentPath), [currentPath])
  const activeRoute = findProtectedRoute(pathname)

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      navigateTo(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true })
      return
    }

    if (isAuthenticated && (pathname === '/' || pathname === '/login')) {
      const redirectPath = searchParams.get('redirect')
      navigateTo(isSafeRedirect(redirectPath) ? redirectPath : defaultAuthenticatedPath, {
        replace: true,
      })
    }
  }, [currentPath, isAuthenticated, pathname, searchParams])

  if (pathname === '/login' || !isAuthenticated) {
    return (
      <LoginPage
        onAuthenticated={() => {
          const redirectPath = searchParams.get('redirect')
          navigateTo(isSafeRedirect(redirectPath) ? redirectPath : defaultAuthenticatedPath, {
            replace: true,
          })
        }}
      />
    )
  }

  const route = activeRoute ?? findProtectedRoute(defaultAuthenticatedPath)

  return (
    <AppLayout activePath={route?.path ?? defaultAuthenticatedPath}>
      {route ? renderRoute(route) : null}
    </AppLayout>
  )
}

function renderRoute(route: NonNullable<ReturnType<typeof findProtectedRoute>>) {
  if (route.path === '/schedule') {
    return <CalendarPage />
  }
  if (route.path === '/dashboard') {
    return <DashboardPage />
  }
  return <PlaceholderPage route={route} />
}

function parseCurrentPath(path: string) {
  const url = new URL(path, window.location.origin)
  return {
    pathname: url.pathname,
    searchParams: url.searchParams,
  }
}

function isSafeRedirect(value: string | null): value is string {
  return value !== null && value.startsWith('/') && !value.startsWith('//')
}
