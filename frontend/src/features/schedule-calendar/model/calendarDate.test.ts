import { describe, expect, it } from 'vitest'

import {
  calendarDays,
  formatCalendarHeading,
  formatScheduleDateTime,
  formatScheduleTimeRange,
  getCalendarPeriod,
} from './calendarDate'

describe('calendarDate', () => {
  it('fills a monthly grid with complete Sunday-to-Saturday weeks', () => {
    const days = calendarDays('month', '2026-08-12')

    expect(days).toHaveLength(42)
    expect(days.slice(0, 7)).toEqual([
      '2026-07-26',
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
    ])
    expect(days.at(-1)).toBe('2026-09-05')
  })

  it('uses Sunday as the start of a weekly query and heading', () => {
    expect(getCalendarPeriod('week', '2026-08-12')).toEqual({
      from: '2026-08-09T00:00:00+09:00',
      to: '2026-08-16T00:00:00+09:00',
    })
    expect(formatCalendarHeading('week', '2026-08-12')).toBe('2026년 8월 9일 주')
    expect(calendarDays('week', '2026-08-12')).toEqual([
      '2026-08-09',
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
    ])
  })

  it('formats an ISO instant in Asia/Seoul without exposing ISO syntax', () => {
    expect(formatScheduleDateTime('2026-08-16T00:00:00Z')).toBe('2026년 8월 16일 09:00')
  })

  it('formats same-day and cross-day timed ranges in Asia/Seoul', () => {
    expect(formatScheduleTimeRange('2026-08-16T00:00:00Z', '2026-08-16T01:00:00Z', false)).toBe(
      '2026년 8월 16일 09:00–10:00',
    )
    expect(formatScheduleTimeRange('2026-08-16T14:59:00Z', '2026-08-16T15:00:00Z', false)).toBe(
      '2026년 8월 16일 23:59–2026년 8월 17일 00:00',
    )
  })

  it('formats all-day schedules and a midnight boundary in Asia/Seoul', () => {
    expect(formatScheduleTimeRange('2026-08-15T15:00:00Z', '2026-08-16T15:00:00Z', true)).toBe(
      '2026년 8월 16일 · 하루 종일',
    )
    expect(formatScheduleDateTime('2026-08-15T15:00:00Z')).toBe('2026년 8월 16일 00:00')
  })

  it('keeps equivalent ISO instants fixed to Asia/Seoul without changing inputs', () => {
    const utcStart = '2026-08-16T00:00:00Z'
    const seoulStart = '2026-08-16T09:00:00+09:00'

    expect(formatScheduleDateTime(utcStart)).toBe('2026년 8월 16일 09:00')
    expect(formatScheduleDateTime(utcStart)).toBe(formatScheduleDateTime(seoulStart))
    expect(utcStart).toBe('2026-08-16T00:00:00Z')
    expect(seoulStart).toBe('2026-08-16T09:00:00+09:00')
  })
})
