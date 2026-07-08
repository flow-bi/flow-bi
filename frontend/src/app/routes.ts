export type AppPath =
  | '/login'
  | '/change-password'
  | '/'
  | '/dashboard'
  | '/ai-chat'
  | '/calendar'
  | '/organization'
  | '/rooms'
  | '/mypage'
  | '/settings/theme'
  | '/admin'
  | '/admin/users'
  | '/admin/teams'

export type RouteItem = {
  adminOnly?: boolean
  label: string
  path: AppPath
  title: string
}

export const navRoutes: RouteItem[] = [
  { label: '대시보드', path: '/dashboard', title: '대시보드' },
  { label: 'AI 채팅', path: '/ai-chat', title: 'AI 채팅' },
  { label: '캘린더', path: '/calendar', title: '캘린더' },
  { label: '조직도', path: '/organization', title: '조직도' },
  { label: '회의실', path: '/rooms', title: '회의실' },
  { adminOnly: true, label: '관리', path: '/admin', title: '관리자 홈' },
  { label: '마이페이지', path: '/mypage', title: '마이페이지' },
]

export const adminRoutes: RouteItem[] = [
  { adminOnly: true, label: '직원 관리', path: '/admin/users', title: '직원 관리' },
  { adminOnly: true, label: '팀 관리', path: '/admin/teams', title: '팀 관리' },
]

export const themeRoute: RouteItem = {
  label: '테마 설정',
  path: '/settings/theme',
  title: '테마 설정',
}

export function normalizePath(pathname: string): AppPath {
  if (pathname === '/') {
    return '/dashboard'
  }

  const supportedPaths: AppPath[] = [
    '/login',
    '/change-password',
    '/dashboard',
    '/ai-chat',
    '/calendar',
    '/organization',
    '/rooms',
    '/mypage',
    '/settings/theme',
    '/admin',
    '/admin/users',
    '/admin/teams',
  ]

  return supportedPaths.includes(pathname as AppPath) ? (pathname as AppPath) : '/dashboard'
}

export function getRouteTitle(path: AppPath) {
  if (path === '/') {
    return '대시보드'
  }

  const route = [...navRoutes, ...adminRoutes, themeRoute].find((item) => item.path === path)

  return route?.title ?? '대시보드'
}
