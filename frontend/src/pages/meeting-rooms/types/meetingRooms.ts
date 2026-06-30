export interface MeetingRoom {
  id: number
  name: string
  location: string
  capacity: number
  status: string
  desc: string
}

export interface RoomReservation {
  id: number
  roomId: number
  roomName: string
  title: string
  start: string
  end: string
  date: string
  by: string
}

export interface BookingFormState {
  date: string
  start: string
  end: string
  purpose: string
}

export interface BookingFormActions {
  setDate: (value: string) => void
  setStart: (value: string) => void
  setEnd: (value: string) => void
  setPurpose: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}
