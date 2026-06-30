import { X } from 'lucide-react'

import type { MeetingRoom } from '../types/meetingRooms'

interface BookingModalHeaderProps {
  room: MeetingRoom
  onClose: () => void
}

export function BookingModalHeader({ room, onClose }: BookingModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-border">
      <div>
        <h3 className="font-bold text-base text-foreground">회의실 예약</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {room.name} · {room.location} · {room.capacity}인
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
