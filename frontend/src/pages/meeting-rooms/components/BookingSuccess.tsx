import { CheckCircle } from 'lucide-react'

import type { BookingFormState, MeetingRoom } from '../types/meetingRooms'

interface BookingSuccessProps {
  room: MeetingRoom
  formState: BookingFormState
}

export function BookingSuccess({ room, formState }: BookingSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <p className="font-bold text-base text-foreground">예약이 완료되었습니다!</p>
      <p className="text-sm text-muted-foreground mt-1">
        {room.name} · {formState.date} · {formState.start} – {formState.end}
      </p>
    </div>
  )
}
