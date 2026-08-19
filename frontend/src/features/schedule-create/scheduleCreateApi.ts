import { authenticatedFetch } from '../authenticatedFetch'

export type ScheduleType = 'PERSONAL' | 'TEAM' | 'PROJECT'
export type ScheduleVisibility = 'PRIVATE' | 'TEAM' | 'PROJECT'
export type ScheduleColorLabel = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PURPLE'

export interface AttendeeCandidate {
  userId: number
  displayName: string
}

export interface ScheduleTargetOption {
  id: number
  name: string
}

export interface ScheduleTargetOptions {
  teams: ScheduleTargetOption[]
  projects: ScheduleTargetOption[]
}

export interface CreateScheduleRequest {
  title: string
  type: ScheduleType
  visibility: ScheduleVisibility
  startAt: string
  endAt: string
  allDay: boolean
  colorLabel: ScheduleColorLabel
  content: string
  location: string
  creatorAttends: boolean
  participantIds: number[]
  userTargetIds: number[]
  teamTargetIds: number[]
  projectTargetIds: number[]
}

export class ScheduleApiError extends Error {
  public readonly status?: number
  public readonly fieldErrors?: Record<string, string>

  public constructor(message: string, status?: number, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ScheduleApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string
      fieldErrors?: Array<{ field?: string; message?: string }>
    } | null
    const fieldErrors = Object.fromEntries(
      (body?.fieldErrors ?? []).flatMap(({ field, message }) =>
        field && message ? [[field, message]] : [],
      ),
    )
    throw new ScheduleApiError(
      body?.message ?? '일정을 저장하지 못했습니다. 다시 시도해 주세요.',
      response.status,
      fieldErrors,
    )
  }
  return (await response.json()) as T
}

export async function createSchedule(request: CreateScheduleRequest): Promise<void> {
  await requestJson('/api/schedules', { method: 'POST', body: JSON.stringify(request) })
}

export async function searchAttendees(query: string): Promise<AttendeeCandidate[]> {
  if (!query.trim()) {
    return []
  }
  const response = await requestJson<{ data: AttendeeCandidate[] }>(
    `/api/schedules/attendee-candidates?query=${encodeURIComponent(query.trim())}`,
  )
  return response.data
}

export async function getScheduleTargetOptions(): Promise<ScheduleTargetOptions> {
  return requestJson<ScheduleTargetOptions>('/api/schedules/target-options')
}
