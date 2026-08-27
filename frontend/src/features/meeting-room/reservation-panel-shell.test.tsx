import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReservationPanelShell } from './reservation-panel-shell'

describe('ReservationPanelShell', () => {
  it('focuses its heading and confirms discarding changed input before closing from the overlay', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ReservationPanelShell title="한강 회의실 예약" isDirty onClose={onClose}>
        <input aria-label="예약 제목" />
      </ReservationPanelShell>,
    )

    expect(screen.getByRole('heading', { name: '한강 회의실 예약' })).toHaveFocus()
    await user.click(screen.getByTestId('reservation-panel-overlay'))
    expect(screen.getByRole('alertdialog', { name: '입력 내용 삭제 확인' })).toBeVisible()
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '입력 내용 삭제' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('uses the same discard confirmation when the panel is closed with Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ReservationPanelShell title="한강 회의실 예약" isDirty onClose={onClose}>
        <input aria-label="예약 제목" />
      </ReservationPanelShell>,
    )

    await user.keyboard('{Escape}')

    expect(screen.getByRole('alertdialog', { name: '입력 내용 삭제 확인' })).toBeVisible()
    expect(onClose).not.toHaveBeenCalled()
  })
})
