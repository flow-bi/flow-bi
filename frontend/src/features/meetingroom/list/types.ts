import type { components } from '../../../shared/types/openapi'

export type ReservationStatus = NonNullable<components['schemas']['ReservationResponse']['status']>

export type Room = {
  roomId: number
  roomName: string
  capacity?: number
  location?: string
  field?: string
  reservations: Reservation[]
}

export type Reservation = {
  reservationId: number
  roomId: number
  scheduleId: number
  title: string
  startAt: string
  endAt: string
  status: ReservationStatus
  cancelledAt?: string
  count?: number
  field?: string
  creatorId?: number
  creatorName?: string
  teamName?: string
}
