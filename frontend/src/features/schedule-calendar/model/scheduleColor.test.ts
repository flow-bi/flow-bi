import { describe, expect, it } from 'vitest'

import { SCHEDULE_COLOR_CLASSES, getScheduleColorClasses } from './scheduleColor'

describe('scheduleColor', () => {
  it('maps every supported color to a distinct, static background class', () => {
    const colors = Object.values(SCHEDULE_COLOR_CLASSES)

    expect(Object.keys(SCHEDULE_COLOR_CLASSES)).toEqual([
      'RED',
      'ORANGE',
      'YELLOW',
      'GREEN',
      'BLUE',
      'PURPLE',
    ])
    expect(new Set(colors.map(({ background }) => background)).size).toBe(6)
    expect(colors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ background: 'bg-red-100', border: 'border-red-300' }),
        expect.objectContaining({ background: 'bg-orange-100', border: 'border-orange-300' }),
        expect.objectContaining({ background: 'bg-yellow-100', border: 'border-yellow-300' }),
        expect.objectContaining({ background: 'bg-green-100', border: 'border-green-300' }),
        expect.objectContaining({ background: 'bg-blue-100', border: 'border-blue-300' }),
        expect.objectContaining({ background: 'bg-violet-100', border: 'border-violet-300' }),
      ]),
    )
  })

  it('uses a readable neutral fallback without assigning a meaning to an unknown color', () => {
    expect(getScheduleColorClasses('UNKNOWN')).toEqual({
      background: 'bg-slate-100',
      border: 'border-slate-300',
      text: 'text-slate-950',
    })
    expect(getScheduleColorClasses('UNKNOWN')).not.toHaveProperty('label')
    expect(getScheduleColorClasses('UNKNOWN')).not.toHaveProperty('ariaLabel')
  })
})
