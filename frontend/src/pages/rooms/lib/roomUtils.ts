import type {
  ReservationFormErrors,
  ReservationFormValues,
  Room,
  RoomReservation,
  RoomSearchFilters,
  RoomStatus,
} from '../types/rooms'

export function formatReservationTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function getRoomStatusLabel(status: RoomStatus) {
  if (status === 'AVAILABLE') {
    return '예약 가능'
  }

  if (status === 'BUSY') {
    return '사용 중'
  }

  return '점검 중'
}

export function getReservationStatusLabel(status: RoomReservation['status']) {
  return status === 'CONFIRMED' ? '확정' : '대기'
}

export function getRoomReservations(rooms: Room[]) {
  return rooms.flatMap((room) =>
    room.reservations.map((reservation) => ({
      ...reservation,
      roomName: room.roomName,
    })),
  )
}

function getMinutes(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':')

  return Number(hours) * 60 + Number(minutes)
}

function hasValidTimeRange(filters: RoomSearchFilters) {
  return filters.date.length > 0 && filters.startTime.length > 0 && filters.endTime.length > 0
}

export function hasReservationConflict(room: Room, filters: RoomSearchFilters) {
  if (!hasValidTimeRange(filters) || filters.startTime >= filters.endTime) {
    return false
  }

  const selectedStart = getMinutes(filters.startTime)
  const selectedEnd = getMinutes(filters.endTime)

  return room.reservations.some((reservation) => {
    if (!reservation.startAt.startsWith(filters.date)) {
      return false
    }

    const reservationStart = getMinutes(reservation.startAt.slice(11, 16))
    const reservationEnd = getMinutes(reservation.endAt.slice(11, 16))

    return selectedStart < reservationEnd && selectedEnd > reservationStart
  })
}

export function getEffectiveRoomStatus(room: Room, filters: RoomSearchFilters): RoomStatus {
  if (room.status === 'MAINTENANCE') {
    return 'MAINTENANCE'
  }

  return hasReservationConflict(room, filters) ? 'BUSY' : 'AVAILABLE'
}

export function filterRooms(rooms: Room[], filters: RoomSearchFilters) {
  const minCapacity = Number(filters.minCapacity || 0)

  return rooms.filter((room) => {
    const matchesCapacity = minCapacity === 0 || room.capacity >= minCapacity
    const effectiveStatus = getEffectiveRoomStatus(room, filters)
    const matchesStatus = filters.status === 'ALL' || effectiveStatus === filters.status

    return matchesCapacity && matchesStatus
  })
}

export function filterReservations(rooms: Room[], filters: RoomSearchFilters) {
  return getRoomReservations(rooms).filter((reservation) =>
    reservation.startAt.startsWith(filters.date),
  )
}

export function buildReservationDateTime(date: string, time: string) {
  return `${date}T${time}:00+09:00`
}

export function validateReservationForm(values: ReservationFormValues): ReservationFormErrors {
  const errors: ReservationFormErrors = {}
  const attendeeCount = values.attendees.length

  if (values.title.trim().length === 0) {
    errors.title = '예약 제목을 입력하세요.'
  }

  if (values.date.length === 0) {
    errors.date = '예약 날짜를 선택하세요.'
  }

  if (values.startTime.length === 0) {
    errors.startTime = '시작 시간을 선택하세요.'
  }

  if (values.endTime.length === 0) {
    errors.endTime = '종료 시간을 선택하세요.'
  }

  if (
    values.startTime.length > 0 &&
    values.endTime.length > 0 &&
    values.startTime >= values.endTime
  ) {
    errors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다.'
  }

  if (attendeeCount < 1) {
    errors.count = '참석자를 1명 이상 추가하세요.'
  }

  if (values.roomId.length === 0) {
    errors.roomId = '회의실을 선택하세요.'
  }

  return errors
}
