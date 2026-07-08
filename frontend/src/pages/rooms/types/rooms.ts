export type RoomStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE'
export type ReservationStatus = 'CONFIRMED' | 'PENDING'

export type RoomReservation = {
  reservationId: string
  roomId: string
  scheduleId: string
  title: string
  teamName: string
  organizerName: string
  startAt: string
  endAt: string
  status: ReservationStatus
  count: number
}

export type Room = {
  roomId: string
  roomName: string
  capacity: number
  location: string
  equipment: string[]
  status: RoomStatus
  reservations: RoomReservation[]
}

export type RoomAttendee = {
  userId: string
  name: string
  teamName: string
  position: string
}

export type RoomSearchFilters = {
  date: string
  startTime: string
  endTime: string
  minCapacity: string
  status: 'ALL' | RoomStatus
}

export type ReservationFormValues = {
  title: string
  date: string
  startTime: string
  endTime: string
  count: string
  roomId: string
  attendees: RoomAttendee[]
}

export type ReservationFormErrors = Partial<Record<keyof ReservationFormValues, string>>
