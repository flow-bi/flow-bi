import type { RoomAvailabilityStatus } from './meeting-room-gateway'

export const ROOM_AVAILABILITY_STATUS_LABELS: Record<RoomAvailabilityStatus, string> = {
  AVAILABLE: '예약 가능',
  RESERVED: '예약중',
}
