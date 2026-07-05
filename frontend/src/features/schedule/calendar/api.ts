import { apiFetch } from '../../../shared/api/client'

import type { ScheduleFormValues } from './schema'
import type { CalendarView, Schedule, ScheduleTarget } from './types'
import type { components } from '../../../shared/types/openapi'

export function fetchSchedules(view: CalendarView, date: string) {
  return apiFetch<Schedule[]>(`/api/v1/schedules?view=${view}&date=${date}`)
}

export function fetchSchedule(scheduleId: number) {
  return apiFetch<Schedule>(`/api/v1/schedules/${scheduleId}`)
}

export function createSchedule(values: ScheduleFormValues) {
  const body = toScheduleRequest(values)
  return apiFetch<Schedule>('/api/v1/schedules', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateSchedule(scheduleId: number, values: ScheduleFormValues) {
  const body = toScheduleRequest(values)
  return apiFetch<Schedule>(`/api/v1/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteSchedule(scheduleId: number) {
  return apiFetch<null>(`/api/v1/schedules/${scheduleId}`, {
    method: 'DELETE',
  })
}

function toScheduleRequest(values: ScheduleFormValues): components['schemas']['ScheduleRequest'] {
  return {
    title: values.title,
    schedule_type: values.scheduleType,
    visibility: values.visibility,
    start_at: toLocalDateTime(values.startAt),
    end_at: toLocalDateTime(values.endAt),
    color_label: values.colorLabel,
    location: values.location || undefined,
    content: values.content || undefined,
    targets: buildTargets(values).map(toScheduleTargetRequest),
  }
}

function buildTargets(values: ScheduleFormValues): ScheduleTarget[] {
  const targets: ScheduleTarget[] = parseIdList(values.attendeeUserIds).map((userId) => ({
    targetType: 'USER',
    userId,
  }))

  if (values.shareMode === 'TEAM' && values.teamId) {
    const teamId = Number(values.teamId)
    targets.push({ targetType: 'TEAM', teamId, ancestorTeamId: teamId })
  }

  if (values.shareMode === 'PROJECT' && values.projectId) {
    targets.push({ targetType: 'PROJECT', projectId: Number(values.projectId) })
  }

  return targets
}

function toScheduleTargetRequest(
  target: ScheduleTarget,
): components['schemas']['ScheduleTargetRequest'] {
  return {
    target_type: target.targetType,
    user_id: target.userId,
    project_id: target.projectId,
    ancestor_team_id: target.ancestorTeamId,
    team_id: target.teamId,
  }
}

function parseIdList(value?: string) {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function toLocalDateTime(value: string) {
  return value.length === 16 ? `${value}:00` : value
}
