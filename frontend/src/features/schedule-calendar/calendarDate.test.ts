import { describe, expect, it } from 'vitest'

import { calendarDays, formatCalendarHeading, getCalendarPeriod } from './calendarDate'

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
})
