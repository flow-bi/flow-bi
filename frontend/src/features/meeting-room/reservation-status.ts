import type { ReservationDisplayStatus } from './meeting-room-gateway'

export const RESERVATION_STATUS_LABELS: Record<ReservationDisplayStatus, string> = {
  UPCOMING: '예약 예정',
  IN_USE: '사용 중',
  COMPLETED: '사용 완료',
}
