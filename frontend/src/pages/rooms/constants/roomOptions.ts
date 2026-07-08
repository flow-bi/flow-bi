import type { RoomStatus } from '../types/rooms'

export const roomStatusOptions: Array<{ label: string; value: 'ALL' | RoomStatus }> = [
  { label: '전체 상태', value: 'ALL' },
  { label: '예약 가능', value: 'AVAILABLE' },
  { label: '사용 중', value: 'BUSY' },
  { label: '점검 중', value: 'MAINTENANCE' },
]
