import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MeetingRoomGatewayError } from './meeting-room-gateway'
import { useReservationCancellation } from './reservation-cancellation'

function CancellationHarness({
  cancelReservation,
}: {
  cancelReservation: (id: number) => Promise<void>
}) {
  const cancellation = useReservationCancellation({
    cancelReservation,
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    roomQueryKey: ['meeting-room', { date: '2026-08-07' }],
  })
  return (
    <>
      <button type="button" onClick={() => cancellation.open({ id: 10, title: '제품 검토' }, 1)}>
        취소 열기
      </button>
      {cancellation.error ? <p role="alert">{cancellation.error}</p> : null}
      <button
        type="button"
        onClick={() => void cancellation.confirm()}
        disabled={cancellation.isSubmitting}
      >
        {cancellation.isSubmitting ? '취소 중' : '취소 실행'}
      </button>
    </>
  )
}

describe('useReservationCancellation', () => {
  it('keeps failure state actionable for not-found, conflict, authentication, and network errors', async () => {
    const user = userEvent.setup()
    const cancelReservation = vi
      .fn()
      .mockRejectedValueOnce(new MeetingRoomGatewayError('ROOM_RESERVATION_NOT_FOUND'))
      .mockRejectedValueOnce(new MeetingRoomGatewayError('ROOM_RESERVATION_CANCEL_CONFLICT'))
      .mockRejectedValueOnce(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING'))
      .mockRejectedValueOnce(new Error('offline'))
    render(<CancellationHarness cancelReservation={cancelReservation} />)

    for (const message of ['권한이 없거나', '최신 예약 현황', '다시 로그인', '네트워크 오류']) {
      await user.click(screen.getByRole('button', { name: '취소 열기' }))
      await user.click(screen.getByRole('button', { name: '취소 실행' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(message)
    }
  })

  it('invalidates only current room, calendar list, and calendar detail queries after success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const user = userEvent.setup()
    function Harness() {
      const cancellation = useReservationCancellation({
        cancelReservation: vi.fn().mockResolvedValue(undefined),
        queryClient,
        roomQueryKey: ['meeting-room', { date: '2026-08-07' }],
      })
      return (
        <>
          <button
            type="button"
            onClick={() => cancellation.open({ id: 10, title: '제품 검토' }, 1)}
          >
            취소 열기
          </button>
          <button type="button" onClick={() => void cancellation.confirm()}>
            취소 실행
          </button>
        </>
      )
    }
    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    )
    await user.click(screen.getByRole('button', { name: '취소 열기' }))
    await user.click(screen.getByRole('button', { name: '취소 실행' }))
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['schedules'] }))
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['schedule-detail'] })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['meeting-room', { date: '2026-08-07' }],
      exact: true,
    })
  })
})
