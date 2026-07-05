import { z } from 'zod'

export const reservationStatusSchema = z.enum(['PENDING', 'RESERVED', 'CANCELLED'])

export const reservationFormSchema = z
  .object({
    title: z.string().min(1, '예약 제목을 입력해주세요.').max(200),
    date: z.string().min(1, '날짜를 선택해주세요.'),
    startTime: z.string().min(1, '시작 시간을 선택해주세요.'),
    endTime: z.string().min(1, '종료 시간을 선택해주세요.'),
    count: z.number().int().min(1, '예상 인원은 1명 이상이어야 합니다.'),
    field: z.string().max(255).optional(),
    attendeeUserIds: z.string().optional(),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: '종료 시간은 시작 시간보다 이후여야 합니다.',
    path: ['endTime'],
  })

export type ReservationFormValues = z.infer<typeof reservationFormSchema>
