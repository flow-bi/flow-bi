import {
  MeetingRoomGatewayError,
  type CreateRoomReservationCommand,
  type MeetingRoomGateway,
  type RoomAvailabilityQuery,
} from '../../../src/features/meeting-room/meeting-room-gateway'

type MeetingRoomTestGatewayOptions = {
  availabilityFailure?: 'AUTH_INTEGRATION_PENDING' | 'TRANSIENT_ONCE'
}

export function meetingRoomTestGateway({
  availabilityFailure,
}: MeetingRoomTestGatewayOptions = {}): MeetingRoomGateway {
  let nextReservationId = 31
  let availabilityRequests = 0
  let editableReservations = [
    {
      reservationId: 10,
      roomId: 1,
      title: '제품 검토',
      startAt: '2026-08-07T09:00:00',
      endAt: '2026-08-07T10:00:00',
      attendeeIds: [1],
      description: '초기 설명',
      canEdit: true,
    },
  ]
  return {
    isReservationCreationAvailable: true,
    isReservationUpdateAvailable: true,
    findAvailability: (query: RoomAvailabilityQuery) => {
      availabilityRequests += 1
      if (availabilityFailure === 'AUTH_INTEGRATION_PENDING') {
        return Promise.reject(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING'))
      }
      if (availabilityFailure === 'TRANSIENT_ONCE' && availabilityRequests === 1) {
        return Promise.reject(new Error('temporary availability failure'))
      }
      const priorityRoom = {
        id: 1,
        name: '한강 회의실',
        capacity: 8,
        location: '3층',
        usesDefaultImage: true,
        reservations: [
          ...editableReservations.map((reservation) => ({
            id: reservation.reservationId,
            title: reservation.title,
            startAt: reservation.startAt,
            endAt: reservation.endAt,
            displayStatus: 'UPCOMING' as const,
            canEdit: reservation.canEdit,
          })),
          {
            id: 11,
            title: '내 것이 아닌 예약',
            startAt: '2026-08-07T10:00:00',
            endAt: '2026-08-07T11:00:00',
            displayStatus: 'UPCOMING' as const,
            canEdit: false,
          },
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
      const rooms =
        query.minimumCapacity || query.preferredReservationStatus
          ? [priorityRoom, laterRoom]
          : [priorityRoom, laterRoom]
      return Promise.resolve({ rooms })
    },
    createReservation: (command: CreateRoomReservationCommand) => {
      if (command.title === '충돌 회의') {
        return Promise.reject(new MeetingRoomGatewayError('ROOM_RESERVATION_CONFLICT'))
      }
      const reservationId = nextReservationId++
      editableReservations = [...editableReservations, { reservationId, ...command, canEdit: true }]
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
          ? { ...reservation, ...command }
          : reservation,
      )
      return Promise.resolve({ reservationId: command.reservationId, scheduleId: 41 })
    },
  }
}
