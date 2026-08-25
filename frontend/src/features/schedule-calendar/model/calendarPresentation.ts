import type { CalendarView } from './calendarDate'
import type { ScheduleSummary } from '../api/scheduleCalendarApi'

export const controlButtonClass =
  'rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-text-primary transition hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'
export const activeControlButtonClass =
  'rounded-lg border border-primary bg-secondary px-3 py-2 font-semibold text-text-primary transition focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'
export const modalCloseButtonClass =
  'absolute top-4 right-4 rounded p-1 text-text-secondary transition hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
export const modalFooterClass =
  'mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end'
export const primaryModalActionClass =
  'w-full rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70 sm:w-auto'

export function dateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function readCalendarUrlState(now: () => Date): { view: CalendarView; date: string } {
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view')
  return {
    view: view === 'week' || view === 'day' ? view : 'month',
    date: /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '')
      ? (params.get('date') as string)
      : dateValue(now()),
  }
}

export function scheduleOnDate(schedule: ScheduleSummary, date: string): boolean {
  const [year, month, day] = date.split('-').map(Number)
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
  return (
    schedule.startAt < `${nextDate}T00:00:00+09:00` && schedule.endAt > `${date}T00:00:00+09:00`
  )
}

export function typeLabel(type: ScheduleSummary['type']): string {
  return { PERSONAL: '개인', TEAM: '팀', PROJECT: '프로젝트' }[type]
}

export function koreanDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}년 ${month}월 ${day}일`
}

export function scheduleActionError(
  error: unknown,
  action: 'update' | 'cancel' | 'roomReservationCancel',
): string {
  const status = (error as { status?: number } | undefined)?.status
  if (status === 401) {
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  }
  if (status === 403) {
    return action === 'roomReservationCancel'
      ? '이 예약을 취소할 권한이 없습니다.'
      : `이 일정을 ${action === 'cancel' ? '취소' : '수정'}할 권한이 없습니다.`
  }
  if (status === 404) {
    return action === 'roomReservationCancel'
      ? '예약을 찾을 수 없습니다. 목록을 새로고침해 주세요.'
      : '일정을 찾을 수 없습니다. 목록을 새로고침해 주세요.'
  }
  if (status === 409) {
    return action === 'roomReservationCancel'
      ? '예약 취소 중 충돌이 발생했습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.'
      : '회의실 예약 관리 일정입니다. 회의실 예약 취소 흐름을 사용해 주세요.'
  }
  return '네트워크 오류가 발생했습니다. 기존 일정은 유지됩니다. 다시 시도해 주세요.'
}

export function listErrorText(error: unknown): string {
  const status = (error as { status?: number } | undefined)?.status
  return status === 401
    ? '인증이 만료되었습니다. 다시 로그인해 주세요.'
    : status === 403
      ? '일정을 볼 권한이 없습니다.'
      : '일정을 불러오지 못했습니다. 다시 시도해 주세요.'
}
