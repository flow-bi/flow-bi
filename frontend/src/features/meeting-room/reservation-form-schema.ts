import type {
  CreateRoomReservationCommand,
  UpdateRoomReservationCommand,
} from './meeting-room-gateway'

export interface ReservationFormValues {
  title: string
  date: string
  startTime: string
  endTime: string
  attendeeIds: number[]
  description: string
}

export type ReservationFormErrors = Partial<Record<keyof ReservationFormValues, string>>

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
  if (!values.startTime) {
    errors.startTime = '시작 시간을 선택해 주세요.'
  }
  if (!values.endTime) {
    errors.endTime = '종료 시간을 선택해 주세요.'
  }
  if (values.startTime && values.endTime && values.startTime >= values.endTime) {
    errors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다.'
  }
  if (values.startTime < '09:00' || values.endTime > '18:00') {
    errors.endTime = '예약 시간은 09:00부터 18:00 사이여야 합니다.'
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
    attendeeIds: values.attendeeIds,
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
