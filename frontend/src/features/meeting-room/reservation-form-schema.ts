import { z } from 'zod'

import { validateMeetingTimes } from './meeting-time'

import type {
  CreateRoomReservationCommand,
  UpdateRoomReservationCommand,
} from './meeting-room-gateway'

const attendeeSchema = z.object({ userId: z.number(), displayName: z.string() })

export function reservationFormSchema(capacity: number) {
  return z
    .object({
      title: z.string().trim().min(1, '예약 제목을 입력해 주세요.'),
      date: z.string().min(1, '예약 날짜를 선택해 주세요.'),
      startTime: z.string(),
      endTime: z.string(),
      creatorAttends: z.boolean(),
      attendeeIds: z.array(z.number()),
      attendees: z.array(attendeeSchema).optional(),
      description: z.string(),
    })
    .superRefine((values, context) => {
      const timeErrors = validateMeetingTimes(values.startTime, values.endTime)
      if (timeErrors.startTime) {
        context.addIssue({ code: 'custom', path: ['startTime'], message: timeErrors.startTime })
      }
      if (timeErrors.endTime) {
        context.addIssue({ code: 'custom', path: ['endTime'], message: timeErrors.endTime })
      }
      const attendeeCount = values.attendeeIds.length + Number(values.creatorAttends)
      if (attendeeCount === 0 || attendeeCount > capacity) {
        context.addIssue({
          code: 'custom',
          path: ['attendeeIds'],
          message:
            attendeeCount === 0
              ? '참석자를 한 명 이상 추가해 주세요.'
              : `참석자 수가 회의실 수용 인원(${capacity}명)을 초과했습니다.`,
        })
      }
    })
}

export type ReservationFormValues = z.infer<ReturnType<typeof reservationFormSchema>>

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
    creatorAttends: false,
    attendeeIds: [],
    description: '',
  }
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
    creatorAttends: values.creatorAttends,
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
