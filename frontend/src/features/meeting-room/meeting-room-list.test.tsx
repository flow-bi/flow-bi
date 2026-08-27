import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RoomAvailabilityList } from './meeting-room-list'

describe('RoomAvailabilityList', () => {
  it('renders a desktop timetable and the mobile text alternative with owned-reservation actions', () => {
    render(
      <RoomAvailabilityList
        rooms={[
          {
            id: 1,
            name: '한강 회의실',
            capacity: 8,
            location: '3층',
            usesDefaultImage: true,
            reservations: [
              {
                id: 10,
                title: '제품 검토',
                startAt: '2026-08-07T09:00:00',
                endAt: '2026-08-07T10:00:00',
                displayStatus: 'UPCOMING',
                canEdit: true,
              },
            ],
          },
        ]}
        isSubmissionAvailable
        isUpdateAvailable
        isCancellationAvailable
        onReserve={vi.fn()}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('9시부터 18시까지 예약 시간표')).toBeInTheDocument()
    expect(screen.getByLabelText('예약 텍스트 목록')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예약 수정: 제품 검토' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예약 취소: 제품 검토' })).toBeInTheDocument()
  })
})
