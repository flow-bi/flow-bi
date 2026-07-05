import { z } from 'zod'

export const scheduleTypeSchema = z.enum(['PERSONAL', 'TEAM', 'PROJECT'])
export const visibilitySchema = z.enum(['PUBLIC', 'PRIVATE', 'TEAM_ONLY'])
export const colorLabelSchema = z.enum(['빨강', '주황', '노랑', '초록', '파랑', '보라'])
export const shareModeSchema = z.enum(['PERSONAL', 'TEAM', 'PROJECT'])

export const scheduleFormSchema = z
  .object({
    title: z.string().min(1, '일정 제목을 입력해주세요.').max(200),
    scheduleType: scheduleTypeSchema,
    visibility: visibilitySchema,
    startAt: z.string().min(1, '시작 일시를 입력해주세요.'),
    endAt: z.string().min(1, '종료 일시를 입력해주세요.'),
    colorLabel: colorLabelSchema,
    location: z.string().max(30).optional(),
    content: z.string().max(200).optional(),
    attendeeUserIds: z.string().optional(),
    shareMode: shareModeSchema,
    teamId: z.string().optional(),
    projectId: z.string().optional(),
  })
  .refine((value) => new Date(value.startAt).getTime() < new Date(value.endAt).getTime(), {
    message: '종료 일시는 시작 일시보다 이후여야 합니다.',
    path: ['endAt'],
  })

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>
