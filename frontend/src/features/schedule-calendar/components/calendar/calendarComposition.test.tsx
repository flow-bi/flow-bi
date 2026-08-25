import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CalendarHeader } from './CalendarHeader'

describe('calendar composition components', () => {
  it('keeps view and period controls in the header responsibility', () => {
    render(
      <CalendarHeader
        date="2024-02-15"
        onCreateSchedule={vi.fn()}
        onNavigate={vi.fn()}
        onSelectView={vi.fn()}
        onToday={vi.fn()}
        view="month"
      />,
    )

    expect(screen.getByRole('group', { name: '기간 이동' })).toBeVisible()
    expect(screen.getByRole('group', { name: '보기 선택' })).toBeVisible()
    expect(screen.getByRole('button', { name: '일정 추가' })).toBeVisible()
  })
})
