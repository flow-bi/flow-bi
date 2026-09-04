import { authenticatedFetch } from '../authenticatedFetch'
import {
  MEETING_ROOM_GATEWAY_ERROR_CODES,
  MeetingRoomGatewayError,
  type CreateRoomReservationCommand,
  type CreateRoomReservationResult,
  type EditableRoomReservation,
  type MeetingRoomGateway,
  type MeetingRoomGatewayErrorCode,
  type RoomAvailabilityQuery,
  type RoomAvailabilityResponse,
  type RoomReservationAttendee,
  type UpdateRoomReservationResult,
} from './meeting-room-gateway-contract'

type RoomReservationDetailResponse = Omit<EditableRoomReservation, 'canEdit'> & {
  editable: boolean
}

function errorCodeFor(status: number, code: unknown): MeetingRoomGatewayErrorCode {
  if (status === 401) {
    return 'AUTH_INTEGRATION_PENDING'
  }
  if (status === 403) {
    return 'ATTENDEE_SEARCH_FORBIDDEN'
  }
  if (
    typeof code === 'string' &&
    MEETING_ROOM_GATEWAY_ERROR_CODES.includes(code as MeetingRoomGatewayErrorCode)
  ) {
    return code as MeetingRoomGatewayErrorCode
  }
  if (status === 404) {
    return 'ROOM_RESERVATION_NOT_FOUND'
  }
  return 'ROOM_RESERVATION_INVALID'
}

async function toGatewayError(response: Response): Promise<MeetingRoomGatewayError> {
  const payload: unknown = await response.json().catch(() => undefined)
  const code =
    typeof payload === 'object' && payload !== null && 'code' in payload ? payload.code : undefined
  return new MeetingRoomGatewayError(errorCodeFor(response.status, code))
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(url, options)
  if (!response.ok) {
    throw await toGatewayError(response)
  }
  return response.json() as Promise<T>
}

async function requestEmpty(url: string, options: RequestInit): Promise<void> {
  const response = await authenticatedFetch(url, options)
  if (!response.ok) {
    throw await toGatewayError(response)
  }
}

function availabilityUrl(query: RoomAvailabilityQuery): string {
  const search = new URLSearchParams()
  search.set('date', query.date)
  if (query.startTime !== undefined) {
    search.set('startTime', query.startTime)
  }
  if (query.endTime !== undefined) {
    search.set('endTime', query.endTime)
  }
  if (query.minimumCapacity !== undefined) {
    search.set('minimumCapacity', String(query.minimumCapacity))
  }
  if (query.availabilityStatus !== undefined) {
    search.set('availabilityStatus', query.availabilityStatus)
  }
  return `/api/rooms?${search.toString()}`
}

function normalizedAttendeeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ')
}

function reservationRequestBody(command: CreateRoomReservationCommand): string {
  return JSON.stringify({
    roomId: command.roomId,
    title: command.title,
    startAt: command.startAt,
    endAt: command.endAt,
    creatorAttends: command.creatorAttends ?? false,
    attendeeIds: command.attendeeIds,
    description: command.description,
  })
}

export const productionMeetingRoomGateway: MeetingRoomGateway = {
  findAvailability: (query) => requestJson<RoomAvailabilityResponse>(availabilityUrl(query)),
  findAttendeeCandidates: async (query) => {
    const normalizedQuery = normalizedAttendeeQuery(query)
    if (!normalizedQuery) {
      return []
    }
    const response = await requestJson<{ data: RoomReservationAttendee[] }>(
      `/api/schedules/attendee-candidates?query=${encodeURIComponent(normalizedQuery)}`,
    )
    return response.data
  },
  createReservation: (command) =>
    requestJson<CreateRoomReservationResult>('/api/room-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: reservationRequestBody(command),
    }),
  getReservationForEdit: async (reservationId) => {
    const response = await requestJson<RoomReservationDetailResponse>(
      `/api/room-reservations/${reservationId}`,
    )
    const { editable, ...reservation } = response
    return { ...reservation, canEdit: editable }
  },
  updateReservation: ({ reservationId, ...command }) =>
    requestJson<UpdateRoomReservationResult>(`/api/room-reservations/${reservationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: reservationRequestBody(command),
    }),
  cancelReservation: (reservationId) =>
    requestEmpty(`/api/room-reservations/${reservationId}`, { method: 'DELETE' }),
}
