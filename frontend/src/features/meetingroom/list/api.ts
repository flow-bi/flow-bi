import { apiFetch } from '../../../shared/api/client'

import type { ReservationFormValues } from './schema'
import type { Reservation, Room } from './types'
import type { components } from '../../../shared/types/openapi'

type RoomResponse = components['schemas']['RoomResponse']
type ReservationResponse = components['schemas']['ReservationResponse']
type ReservationRequest = components['schemas']['ReservationRequest']

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

export function updateReservation(reservationId: number, values: ReservationFormValues) {
  return apiFetch<ReservationResponse>(`/api/v1/rooms/reservations/${reservationId}`, {
    method: 'PATCH',
    body: JSON.stringify(toReservationRequest(values)),
  }).then(toReservation)
}

export function cancelReservation(reservationId: number) {
  return apiFetch<null>(`/api/v1/rooms/reservations/${reservationId}`, {
    method: 'DELETE',
  })
}

function toReservationRequest(values: ReservationFormValues): ReservationRequest {
  return {
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

function toRoom(room: RoomResponse): Room {
  return {
    roomId: room.room_id ?? 0,
    roomName: room.room_name ?? '',
    capacity: room.capacity,
    location: room.location,
    field: room.field,
    reservations: room.reservations?.map(toReservation) ?? [],
  }
}

function toReservation(reservation: ReservationResponse): Reservation {
  return {
    reservationId: reservation.reservation_id ?? 0,
    roomId: reservation.room_id ?? 0,
    scheduleId: reservation.schedule_id ?? 0,
    title: reservation.title ?? '',
    startAt: reservation.start_at ?? '',
    endAt: reservation.end_at ?? '',
    status: reservation.status ?? 'RESERVED',
    cancelledAt: reservation.cancelled_at,
    count: reservation.count,
    field: reservation.field,
    teamName: reservation.team_name,
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
