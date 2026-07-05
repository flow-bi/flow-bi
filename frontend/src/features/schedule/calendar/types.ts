import type { components } from '../../../shared/types/openapi'

export type CalendarView = 'month' | 'week' | 'day'

export type Schedule = {
  scheduleId: number
  title: string
  scheduleType: NonNullable<components['schemas']['ScheduleResponse']['schedule_type']>
  visibility: NonNullable<components['schemas']['ScheduleResponse']['visibility']>
  startAt: string
  endAt: string
  creatorId: number
  colorLabel?: string
  location?: string
  content?: string
  targets: ScheduleTarget[]
}

export type ScheduleTarget = {
  targetType: NonNullable<components['schemas']['ScheduleTargetResponse']['target_type']>
  userId?: number
  projectId?: number
  ancestorTeamId?: number
  teamId?: number
}
