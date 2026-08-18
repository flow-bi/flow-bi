import {
  MeetingRoomGatewayError,
  type CreateRoomReservationCommand,
  type EditableRoomReservation,
  type MeetingRoomGateway,
  type RoomAvailabilityQuery,
  type RoomReservationSummary,
  type RoomSummary,
  type UpdateRoomReservationCommand,
} from './meeting-room-gateway'

interface DevelopmentReservation extends EditableRoomReservation {
  scheduleId: number
  displayStatus: RoomReservationSummary['displayStatus']
}

const developmentRooms: Omit<RoomSummary, 'reservations'>[] = [
  { id: 1, name: '한강 회의실', capacity: 8, location: '3층', usesDefaultImage: true },
  { id: 2, name: '남산 회의실', capacity: 4, location: '2층', usesDefaultImage: true },
]

function overlaps(
  candidate: Pick<CreateRoomReservationCommand, 'startAt' | 'endAt'>,
  existing: Pick<DevelopmentReservation, 'startAt' | 'endAt'>,
): boolean {
  return candidate.startAt < existing.endAt && candidate.endAt > existing.startAt
}

function validateCommand(
  command: CreateRoomReservationCommand,
  reservations: DevelopmentReservation[],
  excludedReservationId?: number,
): void {
  const room = developmentRooms.find((candidate) => candidate.id === command.roomId)
  if (
    !room ||
    command.startAt >= command.endAt ||
    command.attendeeIds.length === 0 ||
    command.attendeeIds.some((attendeeId) => !Number.isInteger(attendeeId) || attendeeId < 1)
  ) {
    throw new MeetingRoomGatewayError('ROOM_RESERVATION_INVALID')
  }
  if (new Set(command.attendeeIds).size > room.capacity) {
    throw new MeetingRoomGatewayError('ROOM_CAPACITY_EXCEEDED')
  }
  if (
    reservations.some(
      (reservation) =>
        reservation.reservationId !== excludedReservationId &&
        reservation.roomId === command.roomId &&
        overlaps(command, reservation),
    )
  ) {
    throw new MeetingRoomGatewayError('ROOM_RESERVATION_CONFLICT')
  }
}

function toSummary(reservation: DevelopmentReservation): RoomReservationSummary {
  return {
    id: reservation.reservationId,
    title: reservation.title,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    displayStatus: reservation.displayStatus,
    canEdit: reservation.canEdit,
  }
}

function matchesQuery(room: RoomSummary, query: RoomAvailabilityQuery): boolean {
  if (query.minimumCapacity !== undefined && room.capacity < query.minimumCapacity) {
    return false
  }
  if (query.availabilityStatus === 'AVAILABLE') {
    return room.reservations.length === 0
  }
  if (query.availabilityStatus === 'RESERVED') {
    return room.reservations.length > 0
  }
  return true
}

export function createDevelopmentMeetingRoomGateway(): MeetingRoomGateway {
  let nextReservationId = 100
  let nextScheduleId = 1000
  let initialDate: string | undefined
  let reservations: DevelopmentReservation[] = []

  function ensureInitialReservation(date: string): void {
    if (initialDate !== undefined) {
      return
    }
    initialDate = date
    reservations = [
      {
        reservationId: 10,
        scheduleId: 10,
        roomId: 1,
        title: '제품 검토',
        startAt: `${date}T10:00:00`,
        endAt: `${date}T11:00:00`,
        attendeeIds: [1],
        description: '개발용 샘플 예약',
        canEdit: true,
        displayStatus: 'IN_USE',
      },
    ]
  }

  return {
    isReservationCreationAvailable: true,
    isReservationUpdateAvailable: true,
    findAvailability: (query) => {
      ensureInitialReservation(query.date)
      const queryPeriod =
        query.startTime !== undefined && query.endTime !== undefined
          ? {
              startAt: `${query.date}T${query.startTime}:00`,
              endAt: `${query.date}T${query.endTime}:00`,
            }
          : undefined
      const rooms = developmentRooms.map((room) => ({
        ...room,
        reservations: reservations
          .filter(
            (reservation) =>
              reservation.roomId === room.id &&
              reservation.startAt.startsWith(`${query.date}T`) &&
              (queryPeriod === undefined || overlaps(queryPeriod, reservation)),
          )
          .map(toSummary),
      }))
      return Promise.resolve({
        rooms: rooms.filter((room) => matchesQuery(room, query)),
      })
    },
    createReservation: (command) => {
      try {
        validateCommand(command, reservations)
      } catch (error) {
        return Promise.reject(
          error instanceof Error ? error : new MeetingRoomGatewayError('ROOM_RESERVATION_INVALID'),
        )
      }
      const reservationId = nextReservationId++
      const scheduleId = nextScheduleId++
      reservations = [
        ...reservations,
        { ...command, reservationId, scheduleId, canEdit: true, displayStatus: 'UPCOMING' },
      ]
      return Promise.resolve({ reservationId, scheduleId })
    },
    getReservationForEdit: (reservationId) => {
      const reservation = reservations.find(
        (candidate) => candidate.reservationId === reservationId,
      )
      if (!reservation || !reservation.canEdit) {
        return Promise.reject(new MeetingRoomGatewayError('ROOM_RESERVATION_NOT_FOUND'))
      }
      return Promise.resolve({ ...reservation })
    },
    updateReservation: (command: UpdateRoomReservationCommand) => {
      const current = reservations.find(
        (candidate) => candidate.reservationId === command.reservationId,
      )
      if (!current || !current.canEdit) {
        return Promise.reject(new MeetingRoomGatewayError('ROOM_RESERVATION_NOT_FOUND'))
      }
      try {
        validateCommand(command, reservations, command.reservationId)
      } catch (error) {
        return Promise.reject(
          error instanceof Error ? error : new MeetingRoomGatewayError('ROOM_RESERVATION_INVALID'),
        )
      }
      reservations = reservations.map((reservation) =>
        reservation.reservationId === command.reservationId
          ? { ...reservation, ...command }
          : reservation,
      )
      return Promise.resolve({
        reservationId: command.reservationId,
        scheduleId: current.scheduleId,
      })
    },
  }
}
