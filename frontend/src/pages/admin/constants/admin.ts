import type { AdminTab } from '../types/admin'

export const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'users', label: '사용자 관리' },
  { id: 'rooms', label: '회의실 관리' },
  { id: 'grades', label: '직급·직책' },
]
