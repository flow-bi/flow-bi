import { describe, expect, it } from 'vitest'

import { layoutDayTimelineSchedules } from './dayTimeline'

const selectedDate = '2024-02-29'

describe('layoutDayTimelineSchedules', () => {
  it('maps morning, noon, and night schedules to their Seoul minute positions', () => {
    expect(
      layoutDayTimelineSchedules(selectedDate, [
        { id: 1, startAt: '2024-02-29T09:00:00+09:00', endAt: '2024-02-29T10:00:00+09:00' },
        { id: 2, startAt: '2024-02-29T12:00:00+09:00', endAt: '2024-02-29T13:30:00+09:00' },
        { id: 3, startAt: '2024-02-29T23:30:00+09:00', endAt: '2024-03-01T00:00:00+09:00' },
      ]),
    ).toEqual([
      { id: 1, top: 540, height: 60, column: 0, columnCount: 1 },
      { id: 2, top: 720, height: 90, column: 0, columnCount: 1 },
      { id: 3, top: 1410, height: 30, column: 0, columnCount: 1 },
    ])
  })

  it('clips schedules to the selected day and gives short schedules a readable minimum height', () => {
    expect(
      layoutDayTimelineSchedules(selectedDate, [
        { id: 1, startAt: '2024-02-28T23:30:00+09:00', endAt: '2024-02-29T00:15:00+09:00' },
        { id: 2, startAt: '2024-02-29T23:45:00+09:00', endAt: '2024-03-01T01:00:00+09:00' },
        { id: 3, startAt: '2024-02-29T12:00:00+09:00', endAt: '2024-02-29T12:05:00+09:00' },
      ]),
    ).toEqual([
      { id: 1, top: 0, height: 24, column: 0, columnCount: 1 },
      { id: 3, top: 720, height: 24, column: 0, columnCount: 1 },
      { id: 2, top: 1425, height: 15, column: 0, columnCount: 1 },
    ])
  })

  it('assigns overlapping schedules deterministic columns regardless of input order', () => {
    const schedules = [
      { id: 30, startAt: '2024-02-29T09:30:00+09:00', endAt: '2024-02-29T10:30:00+09:00' },
      { id: 10, startAt: '2024-02-29T09:00:00+09:00', endAt: '2024-02-29T10:00:00+09:00' },
      { id: 20, startAt: '2024-02-29T09:00:00+09:00', endAt: '2024-02-29T09:45:00+09:00' },
    ]

    const expected = [
      { id: 20, top: 540, height: 45, column: 0, columnCount: 3 },
      { id: 10, top: 540, height: 60, column: 1, columnCount: 3 },
      { id: 30, top: 570, height: 60, column: 2, columnCount: 3 },
    ]

    expect(layoutDayTimelineSchedules(selectedDate, schedules)).toEqual(expected)
    expect(layoutDayTimelineSchedules(selectedDate, [...schedules].reverse())).toEqual(expected)
  })
})
