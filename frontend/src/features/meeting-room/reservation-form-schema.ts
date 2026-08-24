import { validateMeetingTimes } from './meeting-time'

import type {
  CreateRoomReservationCommand,
  RoomReservationAttendee,
  UpdateRoomReservationCommand,
} from './meeting-room-gateway'

export interface ReservationFormValues {
  title: string
  date: string
  startTime: string
  endTime: string
  attendeeIds: number[]
  attendees?: RoomReservationAttendee[]
  description: string
}

export type ReservationFormErrors = Partial<Record<keyof ReservationFormValues, string>>

export function initialReservationValuesFromSearch({
  date,
  startTime,
  endTime,
}: Pick<ReservationFormValues, 'date' | 'startTime' | 'endTime'>): ReservationFormValues {
  return {
    title: '',
    date,
    startTime,
    endTime,
    attendeeIds: [],
    description: '',
  }
}

export function validateReservationForm(
  values: ReservationFormValues,
  capacity: number,
): ReservationFormErrors {
  const errors: ReservationFormErrors = {}
  if (values.title.trim() === '') {
    errors.title = '예약 제목을 입력해 주세요.'
  }
  if (!values.date) {
    errors.date = '예약 날짜를 선택해 주세요.'
  }
  Object.assign(errors, validateMeetingTimes(values.startTime, values.endTime))
  if (values.attendeeIds.length === 0) {
    errors.attendeeIds = '참석자를 한 명 이상 추가해 주세요.'
  }
  if (values.attendeeIds.length > capacity) {
    errors.attendeeIds = `참석자 수가 회의실 수용 인원(${capacity}명)을 초과했습니다.`
  }
  return errors
}

export function toReservationCommand(
  roomId: number,
  values: ReservationFormValues,
): CreateRoomReservationCommand {
  return {
    roomId,
    title: values.title.trim(),
    startAt: `${values.date}T${values.startTime}:00`,
    endAt: `${values.date}T${values.endTime}:00`,
    attendeeIds: [...new Set(values.attendeeIds)],
    description: values.description.trim(),
  }
}

export function toUpdateReservationCommand(
  reservationId: number,
  roomId: number,
  values: ReservationFormValues,
): UpdateRoomReservationCommand {
  return { reservationId, ...toReservationCommand(roomId, values) }
}
