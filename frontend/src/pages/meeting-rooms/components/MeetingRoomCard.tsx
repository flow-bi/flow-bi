import { Clock, MapPin, Users } from 'lucide-react'

import { RoomStatusBadge } from '@/components/shared/RoomStatusBadge'
import { BRAND_PRIMARY } from '@/constants/brand'

import { formatReservationTimeRange, isRoomAvailable } from '../lib/meetingRooms'

import type { MeetingRoom, RoomReservation } from '../types/meetingRooms'

interface MeetingRoomCardProps {
  room: MeetingRoom
  reservations: RoomReservation[]
  onBookRoom: (room: MeetingRoom) => void
}

export function MeetingRoomCard({ room, reservations, onBookRoom }: MeetingRoomCardProps) {
  const isAvailable = isRoomAvailable(room)

  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden ${
        !isAvailable ? 'opacity-60' : ''
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-base text-foreground">{room.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {room.location}
            </p>
          </div>
          <RoomStatusBadge status={room.status} />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {room.capacity}인
          </span>
          <span className="truncate">{room.desc}</span>
        </div>

        {reservations.length > 0 && (
          <div className="space-y-1.5 mb-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              오늘 예약
            </p>
            {reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5"
              >
                <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-[11px] text-foreground font-semibold">
                  {formatReservationTimeRange(reservation.start, reservation.end)}
                </span>
                <span className="text-[11px] text-muted-foreground ml-auto flex-shrink-0">
                  {reservation.by}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            if (isAvailable) {
              onBookRoom(room)
            }
          }}
          disabled={!isAvailable}
          className="w-full py-2 rounded-lg text-sm font-bold transition-all disabled:cursor-not-allowed"
          style={
            isAvailable
              ? { backgroundColor: BRAND_PRIMARY, color: 'white' }
              : { backgroundColor: '#E2E6EF', color: '#94A3B8' }
          }
        >
          {isAvailable ? '예약하기' : '사용 불가'}
        </button>
      </div>
    </div>
  )
}
