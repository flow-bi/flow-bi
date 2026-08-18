import { z } from 'zod'

import type { ScheduleType, ScheduleVisibility } from './scheduleCreateApi'

export const scheduleTypeDefaults: Record<ScheduleType, ScheduleVisibility> = {
  PERSONAL: 'PRIVATE',
  TEAM: 'TEAM',
  PROJECT: 'PROJECT',
}

export const scheduleFormSchema = z
  .object({
    title: z.string().trim().min(1, '제목을 입력해 주세요.').max(200),
    date: z.string().min(1, '날짜를 선택해 주세요.'),
    startTime: z.string().min(1, '시작 시간을 선택해 주세요.'),
    endTime: z.string().min(1, '종료 시간을 선택해 주세요.'),
    allDay: z.boolean(),
    type: z.enum(['PERSONAL', 'TEAM', 'PROJECT']),
    visibility: z.enum(['PRIVATE', 'TEAM', 'PROJECT']),
    colorLabel: z.enum(['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE']),
    location: z.string().max(200),
    content: z.string().max(5000),
    creatorAttends: z.boolean(),
    participantIds: z.array(z.number().positive()),
    userTargetIds: z.array(z.number().positive()),
    teamTargetIds: z.array(z.number().positive()),
    projectTargetIds: z.array(z.number().positive()),
  })
  .superRefine((value, context) => {
    if (!value.allDay && value.startTime >= value.endTime) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: '종료 시간은 시작 시간보다 뒤여야 합니다.',
      })
    }
    if (value.visibility !== scheduleTypeDefaults[value.type]) {
      context.addIssue({
        code: 'custom',
        path: ['visibility'],
        message: '일정 유형의 기본 공개 범위를 사용해 주세요.',
      })
    }
    if (value.type === 'TEAM' && value.teamTargetIds.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['teamTargetIds'],
        message: '팀 대상을 하나 이상 선택해 주세요.',
      })
    }
    if (value.type === 'PROJECT' && value.projectTargetIds.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['projectTargetIds'],
        message: '프로젝트 대상을 하나 이상 선택해 주세요.',
      })
    }
  })

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>

export function formatScheduleOffset(date: string, time: string): string {
  return `${date}T${time}:00+09:00`
}

export function formatNextDayOffset(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1))
  return formatScheduleOffset(nextDay.toISOString().slice(0, 10), '00:00')
}

export function toScheduleRequest(values: ScheduleFormValues) {
  return {
    title: values.title.trim(),
    type: values.type,
    visibility: values.visibility,
    startAt: formatScheduleOffset(values.date, values.allDay ? '00:00' : values.startTime),
    endAt: values.allDay
      ? formatNextDayOffset(values.date)
      : formatScheduleOffset(values.date, values.endTime),
    allDay: values.allDay,
    colorLabel: values.colorLabel,
    content: values.content.trim(),
    location: values.location.trim(),
    creatorAttends: values.creatorAttends,
    participantIds: values.participantIds,
    userTargetIds: values.userTargetIds,
    teamTargetIds: values.teamTargetIds,
    projectTargetIds: values.projectTargetIds,
  }
}

export function parseIdList(value: string): number[] {
  if (!value.trim()) {
    return []
  }
  return value
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
}
