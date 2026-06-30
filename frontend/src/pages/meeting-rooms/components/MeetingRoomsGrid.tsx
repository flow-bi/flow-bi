import { MeetingRoomCard } from './MeetingRoomCard'
import { getReservationsForRoom } from '../lib/meetingRooms'

import type { MeetingRoom, RoomReservation } from '../types/meetingRooms'

interface MeetingRoomsGridProps {
  rooms: MeetingRoom[]
  reservations: RoomReservation[]
  today: string
  onBookRoom: (room: MeetingRoom) => void
}

export function MeetingRoomsGrid({
  rooms,
  reservations,
  today,
  onBookRoom,
}: MeetingRoomsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {rooms.map((room) => (
        <MeetingRoomCard
          key={room.id}
          room={room}
          reservations={getReservationsForRoom(reservations, room.id, today)}
          onBookRoom={onBookRoom}
        />
      ))}
    </div>
  )
}
