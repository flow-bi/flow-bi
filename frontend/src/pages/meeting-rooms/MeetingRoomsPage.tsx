import { useState } from 'react'

import { TODAY_STR } from '@/lib/date'
import { MEETING_ROOMS, RESERVATIONS } from '@/mocks/rooms'

import { BookingModal } from './components/BookingModal'
import { MeetingRoomsGrid } from './components/MeetingRoomsGrid'
import { MeetingRoomsHeader } from './components/MeetingRoomsHeader'
import { getRoomsByCapacity } from './lib/meetingRooms'

import type { BookingFormActions, BookingFormState, MeetingRoom } from './types/meetingRooms'

export function MeetingRoomsPage() {
  const [bookingRoom, setBookingRoom] = useState<MeetingRoom | null>(null)
  const [bookDate, setBookDate] = useState(TODAY_STR)
  const [bookStart, setBookStart] = useState('09:00')
  const [bookEnd, setBookEnd] = useState('10:00')
  const [bookPurpose, setBookPurpose] = useState('')
  const [bookSuccess, setBookSuccess] = useState(false)
  const [capacityFilter, setCapacityFilter] = useState(0)

  const filteredRooms = getRoomsByCapacity(MEETING_ROOMS, capacityFilter)
  const bookingFormState: BookingFormState = {
    date: bookDate,
    start: bookStart,
    end: bookEnd,
    purpose: bookPurpose,
  }

  const handleBook = () => {
    setBookSuccess(true)
    setTimeout(() => {
      setBookSuccess(false)
      setBookingRoom(null)
      setBookPurpose('')
    }, 1800)
  }

  const bookingFormActions: BookingFormActions = {
    setDate: setBookDate,
    setStart: setBookStart,
    setEnd: setBookEnd,
    setPurpose: setBookPurpose,
    onClose: () => setBookingRoom(null),
    onSubmit: handleBook,
  }

  return (
    <div className="p-6">
      <MeetingRoomsHeader
        capacityFilter={capacityFilter}
        onCapacityFilterChange={setCapacityFilter}
      />
      <MeetingRoomsGrid
        rooms={filteredRooms}
        reservations={RESERVATIONS}
        today={TODAY_STR}
        onBookRoom={setBookingRoom}
      />

      {bookingRoom && (
        <BookingModal
          room={bookingRoom}
          formState={bookingFormState}
          formActions={bookingFormActions}
          isSuccess={bookSuccess}
        />
      )}
    </div>
  )
}
