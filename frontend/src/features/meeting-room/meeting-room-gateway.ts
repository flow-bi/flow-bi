import { authenticatedFetch } from '../authenticatedFetch'

export const RESERVATION_DISPLAY_STATUSES = ['UPCOMING', 'IN_USE', 'COMPLETED'] as const

export type ReservationDisplayStatus = (typeof RESERVATION_DISPLAY_STATUSES)[number]

export const ROOM_AVAILABILITY_STATUSES = ['AVAILABLE', 'RESERVED'] as const

export type RoomAvailabilityStatus = (typeof ROOM_AVAILABILITY_STATUSES)[number]

export interface RoomAvailabilityQuery {
  date: string
  startTime?: string
  endTime?: string
  minimumCapacity?: number
  availabilityStatus?: RoomAvailabilityStatus
}

export interface RoomReservationSummary {
  id: number
  title: string
  startAt: string
  endAt: string
  displayStatus: ReservationDisplayStatus
  canEdit: boolean
}

export interface RoomSummary {
  id: number
  name: string
  capacity: number
  location: string
  usesDefaultImage: boolean
  reservations: RoomReservationSummary[]
}

export interface RoomAvailabilityResponse {
  rooms: RoomSummary[]
}

// This mirrors Task 3's Application Service command. It deliberately has no actor ID.
export interface CreateRoomReservationCommand {
  roomId: number
  title: string
  startAt: string
  endAt: string
  attendeeIds: number[]
  description: string
}

export interface CreateRoomReservationResult {
  reservationId: number
  scheduleId: number
}

export interface RoomReservationAttendee {
  userId: number
  displayName: string
}

// This mirrors Task 5's Application Service command. It deliberately has no actor ID.
export interface UpdateRoomReservationCommand extends CreateRoomReservationCommand {
  reservationId: number
}

export interface UpdateRoomReservationResult {
  reservationId: number
  scheduleId: number
}

export interface EditableRoomReservation {
  reservationId: number
  roomId: number
  title: string
  startAt: string
  endAt: string
  attendeeIds: number[]
  attendees: RoomReservationAttendee[]
  description: string
  canEdit: boolean
}

export interface MeetingRoomGateway {
  isReservationCreationAvailable?: boolean
  isReservationUpdateAvailable?: boolean
  isReservationCancellationAvailable?: boolean
  findAvailability(query: RoomAvailabilityQuery): Promise<RoomAvailabilityResponse>
  findAttendeeCandidates?(this: void, query: string): Promise<RoomReservationAttendee[]>
  createReservation?(command: CreateRoomReservationCommand): Promise<CreateRoomReservationResult>
  getReservationForEdit?(reservationId: number): Promise<EditableRoomReservation>
  updateReservation?(command: UpdateRoomReservationCommand): Promise<UpdateRoomReservationResult>
  cancelReservation?(reservationId: number): Promise<void>
}

type MeetingRoomGatewayErrorCode =
  | 'AUTH_INTEGRATION_PENDING'
  | 'ROOM_RESERVATION_CONFLICT'
  | 'ROOM_RESERVATION_INVALID'
  | 'RESERVATION_PARTICIPANT_FORBIDDEN'
  | 'ROOM_CAPACITY_EXCEEDED'
  | 'ROOM_RESERVATION_NOT_FOUND'
  | 'ROOM_RESERVATION_NOT_EDITABLE'
  | 'ROOM_RESERVATION_CANCEL_CONFLICT'
  | 'ATTENDEE_SEARCH_FORBIDDEN'

export class MeetingRoomGatewayError extends Error {
  public readonly code: MeetingRoomGatewayErrorCode

  constructor(code: MeetingRoomGatewayErrorCode) {
    super(code)
    this.name = 'MeetingRoomGatewayError'
    this.code = code
  }
}

export function isMeetingRoomGatewayError(error: unknown): error is MeetingRoomGatewayError {
  return (
    error instanceof MeetingRoomGatewayError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      [
        'AUTH_INTEGRATION_PENDING',
        'ROOM_RESERVATION_CONFLICT',
        'ROOM_RESERVATION_INVALID',
        'RESERVATION_PARTICIPANT_FORBIDDEN',
        'ROOM_CAPACITY_EXCEEDED',
        'ROOM_RESERVATION_NOT_FOUND',
        'ROOM_RESERVATION_NOT_EDITABLE',
        'ROOM_RESERVATION_CANCEL_CONFLICT',
        'ATTENDEE_SEARCH_FORBIDDEN',
      ].includes(error.code))
  )
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
    [
      'ROOM_RESERVATION_CONFLICT',
      'ROOM_RESERVATION_INVALID',
      'RESERVATION_PARTICIPANT_FORBIDDEN',
      'ROOM_CAPACITY_EXCEEDED',
      'ROOM_RESERVATION_NOT_FOUND',
      'ROOM_RESERVATION_NOT_EDITABLE',
      'ROOM_RESERVATION_CANCEL_CONFLICT',
    ].includes(code)
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

function requestBody(command: CreateRoomReservationCommand): string {
  return JSON.stringify({
    roomId: command.roomId,
    title: command.title,
    startAt: command.startAt,
    endAt: command.endAt,
    attendeeIds: command.attendeeIds,
    description: command.description,
  })
}

export const productionMeetingRoomGateway: MeetingRoomGateway = {
  isReservationCreationAvailable: true,
  isReservationUpdateAvailable: true,
  isReservationCancellationAvailable: true,
  findAvailability: (query) => {
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
    return requestJson<RoomAvailabilityResponse>(`/api/rooms?${search.toString()}`)
  },
  findAttendeeCandidates: async (query) => {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ')
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
      body: requestBody(command),
    }),
  getReservationForEdit: (reservationId) =>
    requestJson<EditableRoomReservation>(`/api/room-reservations/${reservationId}`),
  updateReservation: ({ reservationId, ...command }) =>
    requestJson<UpdateRoomReservationResult>(`/api/room-reservations/${reservationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody(command),
    }),
  cancelReservation: (reservationId) =>
    requestEmpty(`/api/room-reservations/${reservationId}`, { method: 'DELETE' }),
}

interface ResolveMeetingRoomGatewayOptions {
  isTestHarness: boolean
  injectedGateway?: MeetingRoomGateway
}

export function resolveMeetingRoomGateway({
  isTestHarness,
  injectedGateway,
}: ResolveMeetingRoomGatewayOptions): MeetingRoomGateway {
  if (isTestHarness && injectedGateway) {
    return injectedGateway
  }
  return productionMeetingRoomGateway
}
