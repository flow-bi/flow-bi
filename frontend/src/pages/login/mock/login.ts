import type { LoginCredentials, LoginStat } from '../types/login'

export const DEMO_ACCOUNT: LoginCredentials = {
  loginId: 'jihoon.kim',
  password: '1234',
}

export const LOGIN_STATS: LoginStat[] = [
  { label: '임직원', value: '248명' },
  { label: '조직', value: '24팀' },
  { label: '회의실', value: '12실' },
]
