import { apiFetch } from '../../../shared/api/client'

import type { ReservationFormValues } from './schema'
import type { Reservation, Room } from './types'
import type { components } from '../../../shared/types/openapi'

type RoomResponse = components['schemas']['RoomResponse']
type ReservationResponse = components['schemas']['ReservationResponse']
type ReservationRequest = components['schemas']['ReservationRequest']
type RoomPayload = RoomResponse & {
  roomId?: number
  roomName?: string
  reservations?: ReservationPayload[]
}
type ReservationPayload = ReservationResponse & {
  reservationId?: number
  roomId?: number
  scheduleId?: number
  startAt?: string
  endAt?: string
  cancelledAt?: string
  creatorId?: number
  creatorName?: string
  teamName?: string
}

export function fetchRooms(params: {
  capacity?: string
  date: string
  timeRange?: string
  status?: string
}) {
  const searchParams = new URLSearchParams()
  if (params.capacity) {
    searchParams.set('capacity', params.capacity)
  }
  if (params.date) {
    searchParams.set('date', params.date)
  }
  if (params.timeRange) {
    searchParams.set('timeRange', params.timeRange)
  }
  if (params.status) {
    searchParams.set('status', params.status)
  }
  return apiFetch<RoomResponse[]>(`/api/v1/rooms?${searchParams.toString()}`).then((rooms) =>
    rooms.map(toRoom),
  )
}

export function fetchRoomReservations(roomId: number, date: string) {
  return apiFetch<ReservationResponse[]>(`/api/v1/rooms/${roomId}/reservations?date=${date}`).then(
    (reservations) => reservations.map(toReservation),
  )
}

export function createReservation(roomId: number, values: ReservationFormValues) {
  return apiFetch<ReservationResponse>(`/api/v1/rooms/${roomId}/reservations`, {
    method: 'POST',
    body: JSON.stringify(toReservationRequest(values)),
  }).then(toReservation)
}

export function updateReservation(params: {
  reservationId: number
  roomId: number
  values: ReservationFormValues
}) {
  return apiFetch<ReservationResponse>(`/api/v1/rooms/reservations/${params.reservationId}`, {
    method: 'PATCH',
    body: JSON.stringify(toReservationRequest(params.values, params.roomId)),
  }).then(toReservation)
}

export function cancelReservation(reservationId: number) {
  return apiFetch<null>(`/api/v1/rooms/reservations/${reservationId}`, {
    method: 'DELETE',
  })
}

function toReservationRequest(values: ReservationFormValues, roomId?: number): ReservationRequest {
  return {
    room_id: roomId,
    title: values.title,
    start_at: `${values.date}T${values.startTime}:00`,
    end_at: `${values.date}T${values.endTime}:00`,
    count: values.count,
    field: values.field || undefined,
    schedule_type: 'TEAM',
    visibility: 'PRIVATE',
    color_label: '파랑',
    targets: parseIdList(values.attendeeUserIds).map((userId) => ({
      target_type: 'USER',
      user_id: userId,
    })),
  }
}

function toRoom(room: RoomPayload): Room {
  return {
    roomId: room.roomId ?? room.room_id ?? 0,
    roomName: room.roomName ?? room.room_name ?? '',
    capacity: room.capacity,
    location: room.location,
    field: room.field,
    reservations: room.reservations?.map(toReservation) ?? [],
  }
}

function toReservation(reservation: ReservationPayload): Reservation {
  return {
    reservationId: reservation.reservationId ?? reservation.reservation_id ?? 0,
    roomId: reservation.roomId ?? reservation.room_id ?? 0,
    scheduleId: reservation.scheduleId ?? reservation.schedule_id ?? 0,
    title: reservation.title ?? '',
    startAt: reservation.startAt ?? reservation.start_at ?? '',
    endAt: reservation.endAt ?? reservation.end_at ?? '',
    status: reservation.status ?? 'RESERVED',
    cancelledAt: reservation.cancelledAt ?? reservation.cancelled_at,
    count: reservation.count,
    field: reservation.field,
    creatorId: reservation.creatorId ?? reservation.creator_id,
    creatorName: reservation.creatorName ?? reservation.creator_name,
    teamName: reservation.teamName ?? reservation.team_name,
  }
}

function parseIdList(value?: string) {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)
}
