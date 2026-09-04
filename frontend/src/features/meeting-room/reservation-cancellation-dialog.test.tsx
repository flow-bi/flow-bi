import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReservationCancellationDialog } from './reservation-cancellation-dialog'

describe('ReservationCancellationDialog', () => {
  it('confirms the irreversible linked-schedule cancellation and restores trigger focus on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()

    render(
      <ReservationCancellationDialog
        roomName="한강 회의실"
        reservation={{
          title: '제품 검토',
          startAt: '2026-08-07T09:00:00',
          endAt: '2026-08-07T10:00:00',
        }}
        isSubmitting={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('alertdialog', { name: '제품 검토 예약 취소 확인' })
    expect(dialog).toHaveTextContent('되돌릴 수 없습니다')
    expect(dialog).toHaveTextContent('예약과 연결 일정이 함께 취소됩니다')
    expect(within(dialog).getByRole('button', { name: '예약 취소 실행' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('cycles focus and prevents close or duplicate confirmation while submitting', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    const { rerender } = render(
      <ReservationCancellationDialog
        roomName="한강 회의실"
        reservation={{
          title: '제품 검토',
          startAt: '2026-08-07T09:00:00',
          endAt: '2026-08-07T10:00:00',
        }}
        isSubmitting={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    const dialog = screen.getByRole('alertdialog')
    const confirm = within(dialog).getByRole('button', { name: '예약 취소 실행' })
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(within(dialog).getByRole('button', { name: '닫기' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()

    rerender(
      <ReservationCancellationDialog
        roomName="한강 회의실"
        reservation={{
          title: '제품 검토',
          startAt: '2026-08-07T09:00:00',
          endAt: '2026-08-07T10:00:00',
        }}
        isSubmitting
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByRole('button', { name: '예약 취소 중' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
