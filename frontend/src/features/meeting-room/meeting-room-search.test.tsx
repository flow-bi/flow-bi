import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RoomAvailabilitySearch } from './meeting-room-search'

describe('RoomAvailabilitySearch', () => {
  it('keeps draft conditions out of the applied query until a valid submit', async () => {
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<RoomAvailabilitySearch initialDate="2026-08-07" onApply={onApply} />)

    await user.clear(screen.getByLabelText('시작 시간'))
    await user.type(screen.getByLabelText('시작 시간'), '10:03')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('시간은 10분 단위로 입력해 주세요.')

    await user.clear(screen.getByLabelText('시작 시간'))
    await user.type(screen.getByLabelText('시작 시간'), '10:10')
    await user.selectOptions(screen.getByLabelText('예약 상태'), 'RESERVED')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))

    expect(onApply).toHaveBeenCalledWith({
      date: '2026-08-07',
      startTime: '10:10',
      endTime: '18:00',
      availabilityStatus: 'RESERVED',
    })
  })
})
