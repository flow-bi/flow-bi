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

export interface CreateRoomReservationCommand {
  roomId: number
  title: string
  startAt: string
  endAt: string
  creatorAttends?: boolean
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
  creatorAttends?: boolean
  attendeeIds: number[]
  attendees: RoomReservationAttendee[]
  description: string
  canEdit: boolean
}

export interface MeetingRoomGateway {
  findAvailability(query: RoomAvailabilityQuery): Promise<RoomAvailabilityResponse>
  findAttendeeCandidates?(this: void, query: string): Promise<RoomReservationAttendee[]>
  createReservation?(command: CreateRoomReservationCommand): Promise<CreateRoomReservationResult>
  getReservationForEdit?(reservationId: number): Promise<EditableRoomReservation>
  updateReservation?(command: UpdateRoomReservationCommand): Promise<UpdateRoomReservationResult>
  cancelReservation?(this: void, reservationId: number): Promise<void>
}

export const MEETING_ROOM_GATEWAY_ERROR_CODES = [
  'AUTH_INTEGRATION_PENDING',
  'ROOM_RESERVATION_CONFLICT',
  'ROOM_RESERVATION_INVALID',
  'RESERVATION_PARTICIPANT_FORBIDDEN',
  'ROOM_CAPACITY_EXCEEDED',
  'ROOM_RESERVATION_NOT_FOUND',
  'ROOM_RESERVATION_NOT_EDITABLE',
  'ROOM_RESERVATION_CANCEL_CONFLICT',
  'ATTENDEE_SEARCH_FORBIDDEN',
] as const

export type MeetingRoomGatewayErrorCode = (typeof MEETING_ROOM_GATEWAY_ERROR_CODES)[number]

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
      MEETING_ROOM_GATEWAY_ERROR_CODES.includes(error.code as MeetingRoomGatewayErrorCode))
  )
}
