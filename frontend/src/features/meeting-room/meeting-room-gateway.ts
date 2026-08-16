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
  canEdit?: boolean
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
  description: string
  canEdit: boolean
}

export interface MeetingRoomGateway {
  isReservationCreationAvailable?: boolean
  isReservationUpdateAvailable?: boolean
  findAvailability(query: RoomAvailabilityQuery): Promise<RoomAvailabilityResponse>
  createReservation?(command: CreateRoomReservationCommand): Promise<CreateRoomReservationResult>
  getReservationForEdit?(reservationId: number): Promise<EditableRoomReservation>
  updateReservation?(command: UpdateRoomReservationCommand): Promise<UpdateRoomReservationResult>
}

export class MeetingRoomGatewayError extends Error {
  public readonly code:
    | 'AUTH_INTEGRATION_PENDING'
    | 'ROOM_RESERVATION_CONFLICT'
    | 'ROOM_RESERVATION_INVALID'
    | 'RESERVATION_PARTICIPANT_FORBIDDEN'
    | 'ROOM_CAPACITY_EXCEEDED'
    | 'ROOM_RESERVATION_NOT_FOUND'
    | 'ROOM_RESERVATION_NOT_EDITABLE'

  constructor(code: MeetingRoomGatewayError['code']) {
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
      ].includes(error.code))
  )
}

export const productionMeetingRoomGateway: MeetingRoomGateway = {
  isReservationCreationAvailable: false,
  isReservationUpdateAvailable: false,
  findAvailability: async () =>
    Promise.reject(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')),
  createReservation: async () =>
    Promise.reject(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')),
  getReservationForEdit: async () =>
    Promise.reject(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')),
  updateReservation: async () =>
    Promise.reject(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')),
}

interface ResolveMeetingRoomGatewayOptions {
  isDevelopment: boolean
  isTestHarness: boolean
  developmentGateway?: MeetingRoomGateway
  injectedGateway?: MeetingRoomGateway
}

export function resolveMeetingRoomGateway({
  isDevelopment,
  isTestHarness,
  developmentGateway,
  injectedGateway,
}: ResolveMeetingRoomGatewayOptions): MeetingRoomGateway {
  if (isDevelopment && isTestHarness && injectedGateway) {
    return injectedGateway
  }
  if (isDevelopment && developmentGateway) {
    return developmentGateway
  }
  return productionMeetingRoomGateway
}
