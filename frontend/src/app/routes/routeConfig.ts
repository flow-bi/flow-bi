export type AppRoute = {
  path: string
  label: string
  description: string
  status: 'real' | 'partial' | 'design-only'
}

export const defaultAuthenticatedPath = '/dashboard'

export const protectedRoutes = [
  {
    path: '/dashboard',
    label: '대시보드',
    description: '주간 일정, 오늘의 일정, 팀원 상태가 들어갈 자리입니다.',
    status: 'partial',
  },
  {
    path: '/schedule',
    label: '캘린더',
    description: '월/주/일 캘린더 화면이 들어갈 자리입니다.',
    status: 'real',
  },
  {
    path: '/org-chart',
    label: '조직도',
    description: '시딩된 조직도 조회 화면이 들어갈 자리입니다.',
    status: 'real',
  },
  {
    path: '/meeting-rooms',
    label: '회의실',
    description: '회의실 조회와 예약 화면이 들어갈 자리입니다.',
    status: 'real',
  },
  {
    path: '/my-page',
    label: '마이페이지',
    description: '내 프로필 조회와 수정 화면이 들어갈 자리입니다.',
    status: 'real',
  },
  {
    path: '/admin',
    label: '관리',
    description: '관리 기능은 MVP1에서 디자인만 제공됩니다.',
    status: 'design-only',
  },
  {
    path: '/setting',
    label: '설정',
    description: '설정 화면은 MVP1에서 디자인만 제공됩니다.',
    status: 'design-only',
  },
] satisfies AppRoute[]

export function findProtectedRoute(pathname: string) {
  return protectedRoutes.find((route) => route.path === pathname)
}
