import type { MeetingRoom, RoomReservation } from '../types/meetingRooms'

export function getRoomsByCapacity<T extends MeetingRoom>(rooms: T[], capacityFilter: number) {
  return rooms.filter((room) => room.capacity >= capacityFilter)
}

export function getReservationsForRoom<T extends RoomReservation>(
  reservations: T[],
  roomId: number,
  date: string,
) {
  return reservations.filter(
    (reservation) => reservation.roomId === roomId && reservation.date === date,
  )
}

export function isRoomAvailable(room: MeetingRoom) {
  return room.status === 'ACTIVE'
}

export function formatReservationTimeRange(start: string, end: string) {
  return `${start} – ${end}`
}
