import { authenticatedFetch } from '../../authenticatedFetch'

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

export interface ScheduleSummary {
  id: number
  title: string
  startAt: string
  endAt: string
  allDay: boolean
  type: ScheduleType
  colorLabel: ScheduleColorLabel
}

export interface ScheduleDetail extends ScheduleSummary {
  visibility: 'PRIVATE' | 'TEAM' | 'PROJECT'
  content: string
  location: string
  creatorAttends: boolean
  participantIds: number[]
  participants: Array<{ userId: number; displayName: string }>
  attendeeCount: number
  userTargetIds: number[]
  teamTargetIds: number[]
  projectTargetIds: number[]
  meetingRoomManaged: boolean
  canManage: boolean
  roomReservationId: number | null
  canCancelRoomReservation: boolean
}

export interface ScheduleWriteRequest {
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

export type CreateScheduleRequest = ScheduleWriteRequest
export type UpdateScheduleRequest = ScheduleWriteRequest

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

export class ScheduleCalendarApiError extends ScheduleApiError {}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await authenticatedFetch(path, { signal })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ScheduleApiError(body?.message ?? '일정을 불러오지 못했습니다.', response.status)
  }
  return (await response.json()) as T
}

async function requestMutation<T>(path: string, init: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
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
      body?.message ?? '요청을 처리하지 못했습니다.',
      response.status,
      fieldErrors,
    )
  }
  return (await response.json()) as T
}

export async function getSchedules(
  period: { from: string; to: string },
  signal?: AbortSignal,
): Promise<ScheduleSummary[]> {
  const query = new URLSearchParams(period)
  const response = await requestJson<ScheduleSummary[] | { data: ScheduleSummary[] }>(
    `/api/schedules?${query}`,
    signal,
  )
  return Array.isArray(response) ? response : response.data
}

export function getScheduleDetail(id: number, signal?: AbortSignal): Promise<ScheduleDetail> {
  return requestJson<ScheduleDetail>(`/api/schedules/${id}`, signal)
}

export function updateSchedule(
  id: number,
  request: UpdateScheduleRequest,
): Promise<ScheduleDetail> {
  return requestMutation<ScheduleDetail>(`/api/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })
}

export async function createSchedule(request: CreateScheduleRequest): Promise<void> {
  await requestMutation('/api/schedules', { method: 'POST', body: JSON.stringify(request) })
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

export function getScheduleTargetOptions(): Promise<ScheduleTargetOptions> {
  return requestJson<ScheduleTargetOptions>('/api/schedules/target-options')
}

export async function cancelSchedule(id: number): Promise<void> {
  const response = await authenticatedFetch(`/api/schedules/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ScheduleApiError(body?.message ?? '일정을 취소하지 못했습니다.', response.status)
  }
}

export async function cancelRoomReservation(reservationId: number): Promise<void> {
  const response = await authenticatedFetch(`/api/room-reservations/${reservationId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ScheduleApiError(
      body?.message ?? '회의실 예약을 취소하지 못했습니다.',
      response.status,
    )
  }
}
