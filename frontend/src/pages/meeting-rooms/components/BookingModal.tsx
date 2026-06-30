import { BookingFormFields } from './BookingFormFields'
import { BookingModalActions } from './BookingModalActions'
import { BookingModalHeader } from './BookingModalHeader'
import { BookingSuccess } from './BookingSuccess'

import type { BookingFormActions, BookingFormState, MeetingRoom } from '../types/meetingRooms'

interface BookingModalProps {
  room: MeetingRoom
  formState: BookingFormState
  formActions: BookingFormActions
  isSuccess: boolean
}

export function BookingModal({ room, formState, formActions, isSuccess }: BookingModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {isSuccess ? (
          <BookingSuccess room={room} formState={formState} />
        ) : (
          <>
            <BookingModalHeader room={room} onClose={formActions.onClose} />
            <BookingFormFields formState={formState} formActions={formActions} />
            <BookingModalActions onClose={formActions.onClose} onSubmit={formActions.onSubmit} />
          </>
        )}
      </div>
    </div>
  )
}
