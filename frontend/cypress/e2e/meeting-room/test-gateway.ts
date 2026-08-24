import {
  MeetingRoomGatewayError,
  type CreateRoomReservationCommand,
  type EditableRoomReservation,
  type MeetingRoomGateway,
  type ReservationDisplayStatus,
  type RoomAvailabilityQuery,
} from '../../../src/features/meeting-room/meeting-room-gateway'

type MeetingRoomTestGatewayOptions = {
  availabilityFailure?: 'AUTH_INTEGRATION_PENDING' | 'TRANSIENT_ONCE'
}

type TestReservation = EditableRoomReservation & {
  displayStatus: ReservationDisplayStatus
}

const attendeeCandidates = [
  { userId: 1, displayName: '김하늘' },
  { userId: 2, displayName: '이바다' },
]

function attendeesFor(attendeeIds: number[]) {
  return attendeeCandidates.filter(({ userId }) => attendeeIds.includes(userId))
}

export function meetingRoomTestGateway({
  availabilityFailure,
}: MeetingRoomTestGatewayOptions = {}): MeetingRoomGateway {
  let nextReservationId = 31
  let availabilityRequests = 0
  let initialAvailabilityDate: string | undefined
  let editableReservations: TestReservation[] = [
    {
      reservationId: 10,
      roomId: 1,
      title: '제품 검토',
      startAt: '2026-08-07T10:00:00',
      endAt: '2026-08-07T11:00:00',
      creatorAttends: false,
      attendeeIds: [1],
      attendees: [attendeeCandidates[0]],
      description: '초기 설명',
      canEdit: true,
      displayStatus: 'IN_USE' as const,
    },
  ]
  return {
    isReservationCreationAvailable: true,
    isReservationUpdateAvailable: true,
    isReservationCancellationAvailable: true,
    findAvailability: (query: RoomAvailabilityQuery) => {
      availabilityRequests += 1
      if (initialAvailabilityDate === undefined) {
        initialAvailabilityDate = query.date
        editableReservations = editableReservations.map((reservation) => ({
          ...reservation,
          startAt: `${query.date}${reservation.startAt.slice(10)}`,
          endAt: `${query.date}${reservation.endAt.slice(10)}`,
        }))
      }
      if (availabilityFailure === 'AUTH_INTEGRATION_PENDING') {
        return Promise.reject(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING'))
      }
      if (availabilityFailure === 'TRANSIENT_ONCE' && availabilityRequests === 1) {
        return Promise.reject(new Error('temporary availability failure'))
      }
      const queryStartAt = query.startTime ? `${query.date}T${query.startTime}:00` : undefined
      const queryEndAt = query.endTime ? `${query.date}T${query.endTime}:00` : undefined
      const overlapsQueryPeriod = (startAt: string, endAt: string) =>
        startAt.startsWith(`${query.date}T`) &&
        (queryStartAt === undefined ||
          queryEndAt === undefined ||
          (startAt < queryEndAt && endAt > queryStartAt))
      const priorityRoom = {
        id: 1,
        name: '한강 회의실',
        capacity: 8,
        location: '3층',
        usesDefaultImage: true,
        reservations: [
          ...editableReservations
            .filter((reservation) => overlapsQueryPeriod(reservation.startAt, reservation.endAt))
            .map((reservation) => ({
              id: reservation.reservationId,
              title: reservation.title,
              startAt: reservation.startAt,
              endAt: reservation.endAt,
              displayStatus: reservation.displayStatus,
              canEdit: reservation.canEdit,
            })),
          ...(query.date === initialAvailabilityDate &&
          overlapsQueryPeriod(
            `${initialAvailabilityDate}T10:00:00`,
            `${initialAvailabilityDate}T11:00:00`,
          )
            ? [
                {
                  id: 11,
                  title: '내 것이 아닌 예약',
                  startAt: `${initialAvailabilityDate}T10:00:00`,
                  endAt: `${initialAvailabilityDate}T11:00:00`,
                  displayStatus: 'IN_USE' as const,
                  canEdit: false,
                },
              ]
            : []),
        ],
      }
      const laterRoom = {
        id: 2,
        name: '남산 회의실',
        capacity: 4,
        location: '2층',
        usesDefaultImage: true,
        reservations: [],
      }
      const rooms = [priorityRoom, laterRoom].filter((room) => {
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
      })
      return Promise.resolve({ rooms })
    },
    findAttendeeCandidates: (query) =>
      Promise.resolve(
        attendeeCandidates.filter(({ displayName }) =>
          displayName.includes(query.trim().replace(/\s+/g, ' ')),
        ),
      ),
    createReservation: (command: CreateRoomReservationCommand) => {
      if (command.title === '충돌 회의') {
        return Promise.reject(new MeetingRoomGatewayError('ROOM_RESERVATION_CONFLICT'))
      }
      const reservationId = nextReservationId++
      editableReservations = [
        ...editableReservations,
        {
          reservationId,
          ...command,
          attendees: attendeesFor(command.attendeeIds),
          canEdit: true,
          displayStatus: 'UPCOMING' as const,
        },
      ]
      return Promise.resolve({ reservationId, scheduleId: 41 })
    },
    getReservationForEdit: (reservationId) => {
      const reservation = editableReservations.find(
        (candidate) => candidate.reservationId === reservationId,
      )
      if (!reservation) {
        return Promise.reject(new MeetingRoomGatewayError('ROOM_RESERVATION_NOT_FOUND'))
      }
      return Promise.resolve(reservation)
    },
    updateReservation: (command) => {
      if (command.title === '충돌 회의') {
        return Promise.reject(new MeetingRoomGatewayError('ROOM_RESERVATION_CONFLICT'))
      }
      editableReservations = editableReservations.map((reservation) =>
        reservation.reservationId === command.reservationId
          ? { ...reservation, ...command, attendees: attendeesFor(command.attendeeIds) }
          : reservation,
      )
      return Promise.resolve({ reservationId: command.reservationId, scheduleId: 41 })
    },
    cancelReservation: (reservationId) => {
      const reservation = editableReservations.find(
        (candidate) => candidate.reservationId === reservationId,
      )
      if (!reservation || !reservation.canEdit) {
        return Promise.reject(new MeetingRoomGatewayError('ROOM_RESERVATION_NOT_FOUND'))
      }
      editableReservations = editableReservations.filter(
        (candidate) => candidate.reservationId !== reservationId,
      )
      return Promise.resolve()
    },
  }
}
