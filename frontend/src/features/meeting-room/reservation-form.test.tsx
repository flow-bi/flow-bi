import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReservationForm } from './reservation-form'
import { initialReservationValuesFromSearch } from './reservation-form-schema'

import type { ComponentProps } from 'react'

function renderForm(overrides: Partial<ComponentProps<typeof ReservationForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ReservationForm
        roomId={3}
        capacity={2}
        mode="create"
        initialValues={initialReservationValuesFromSearch({
          date: '2026-08-07',
          startTime: '09:00',
          endTime: '10:00',
        })}
        onSubmit={onSubmit}
        onRefreshAvailability={vi.fn()}
        onDirtyChange={vi.fn()}
        {...overrides}
      />
    </QueryClientProvider>,
  )
  return onSubmit
}

describe('ReservationForm', () => {
  it('converts creation values without a creator ID and reports successful connected-schedule creation', async () => {
    const onSubmit = renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('예약 제목'), '혼자 사용하는 회의')
    await user.click(screen.getByRole('checkbox', { name: '등록자도 참석' }))
    await user.click(screen.getByRole('button', { name: '예약 및 일정 생성' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        roomId: 3,
        title: '혼자 사용하는 회의',
        startAt: '2026-08-07T09:00:00',
        endAt: '2026-08-07T10:00:00',
        creatorAttends: true,
        attendeeIds: [],
        description: '',
      }),
    )
    expect(screen.getByRole('status')).toHaveTextContent('예약과 연결 일정이 생성되었습니다.')
  })

  it('retains update input after a conflict and offers an availability refresh', async () => {
    const refreshAvailability = vi.fn()
    const user = userEvent.setup()
    renderForm({
      mode: 'update',
      initialValues: {
        ...initialReservationValuesFromSearch({
          date: '2026-08-07',
          startTime: '09:00',
          endTime: '10:00',
        }),
        title: '초기 제목',
        creatorAttends: true,
      },
      onRefreshAvailability: refreshAvailability,
      onSubmit: vi.fn().mockRejectedValue({ code: 'ROOM_RESERVATION_CONFLICT' }),
    })

    await user.clear(screen.getByLabelText('예약 제목'))
    await user.type(screen.getByLabelText('예약 제목'), '충돌 회의')
    await user.click(screen.getByRole('button', { name: '예약 및 일정 수정' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 예약된 시간입니다.')
    expect(screen.getByLabelText('예약 제목')).toHaveValue('충돌 회의')
    await user.click(screen.getByRole('button', { name: '예약 현황 다시 조회' }))
    expect(refreshAvailability).toHaveBeenCalledOnce()
  })

  it('replaces form values when a newly selected reservation remounts the form', async () => {
    const { rerender } = render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ReservationForm
          key={3}
          roomId={3}
          capacity={4}
          mode="update"
          initialValues={{
            ...initialReservationValuesFromSearch({
              date: '2026-08-07',
              startTime: '09:00',
              endTime: '10:00',
            }),
            title: '첫 번째 예약',
            creatorAttends: true,
            description: '첫 번째 설명',
          }}
          onSubmit={vi.fn()}
          onRefreshAvailability={vi.fn()}
          onDirtyChange={vi.fn()}
        />
      </QueryClientProvider>,
    )

    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ReservationForm
          key={4}
          roomId={4}
          capacity={6}
          mode="update"
          initialValues={{
            ...initialReservationValuesFromSearch({
              date: '2026-08-08',
              startTime: '11:00',
              endTime: '12:00',
            }),
            title: '두 번째 예약',
            description: '두 번째 설명',
          }}
          onSubmit={vi.fn()}
          onRefreshAvailability={vi.fn()}
          onDirtyChange={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(screen.getByLabelText('예약 제목')).toHaveValue('두 번째 예약'))
    expect(screen.getByLabelText('상세 설명')).toHaveValue('두 번째 설명')
    expect(screen.getByLabelText('날짜')).toHaveValue('2026-08-08')
  })
})
