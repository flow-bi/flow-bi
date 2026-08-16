import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createDevelopmentMeetingRoomGateway } from './development-meeting-room-gateway'
import {
  MeetingRoomGatewayError,
  productionMeetingRoomGateway,
  resolveMeetingRoomGateway,
  type CreateRoomReservationCommand,
  type MeetingRoomGateway,
  type RoomAvailabilityResponse,
} from './meeting-room-gateway'
import { MeetingRoomPage } from './meeting-room-page'

const rooms = [
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
        displayStatus: 'UPCOMING' as const,
        canEdit: true,
      },
    ],
  },
]

function renderPage(gateway: MeetingRoomGateway) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MeetingRoomPage gateway={gateway} initialDate="2026-08-07" />
    </QueryClientProvider>,
  )
}

function reservationGateway(
  createReservation = vi.fn().mockResolvedValue({ reservationId: 30, scheduleId: 40 }),
): MeetingRoomGateway {
  return {
    isReservationCreationAvailable: true,
    findAvailability: vi.fn().mockResolvedValue({ rooms }),
    createReservation,
  }
}

describe('MeetingRoomPage', () => {
  it('uses an injected gateway only in a test harness', async () => {
    const injectedFindAvailability = vi.fn().mockResolvedValue({ rooms: [] })
    const injectedGateway: MeetingRoomGateway = {
      findAvailability: injectedFindAvailability,
    }

    await expect(
      resolveMeetingRoomGateway({
        isDevelopment: false,
        isTestHarness: false,
        injectedGateway,
      }).findAvailability({ date: '2026-08-07' }),
    ).rejects.toMatchObject({ code: 'AUTH_INTEGRATION_PENDING' })
    expect(injectedFindAvailability).not.toHaveBeenCalled()

    await resolveMeetingRoomGateway({
      isDevelopment: true,
      isTestHarness: true,
      injectedGateway,
    }).findAvailability({ date: '2026-08-07' })
    expect(injectedFindAvailability).toHaveBeenCalledTimes(1)
  })

  it('loads owned reservation values, updates its connected schedule, and refreshes only room availability', async () => {
    const updateReservation = vi.fn().mockResolvedValue({ reservationId: 10, scheduleId: 40 })
    const findAvailability = vi.fn().mockResolvedValue({ rooms })
    const user = userEvent.setup()
    renderPage({
      isReservationCreationAvailable: true,
      isReservationUpdateAvailable: true,
      findAvailability,
      createReservation: vi.fn(),
      getReservationForEdit: vi.fn().mockResolvedValue({
        reservationId: 10,
        roomId: 1,
        title: '제품 검토',
        startAt: '2026-08-07T09:00:00',
        endAt: '2026-08-07T10:00:00',
        attendeeIds: [1],
        description: '초기 설명',
        canEdit: true,
      }),
      updateReservation,
    })
    await user.click(await screen.findByRole('button', { name: '제품 검토 수정' }))
    const panel = screen.getByRole('dialog', { name: '제품 검토 예약 수정' })
    expect(within(panel).getByLabelText('예약 제목')).toHaveValue('제품 검토')
    expect(within(panel).getByLabelText('상세 설명')).toHaveValue('초기 설명')
    await user.clear(within(panel).getByLabelText('예약 제목'))
    await user.type(within(panel).getByLabelText('예약 제목'), '수정된 제품 검토')
    await user.click(within(panel).getByRole('button', { name: '예약 및 일정 수정' }))
    await waitFor(() => expect(updateReservation).toHaveBeenCalledTimes(1))
    expect(updateReservation).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 10, title: '수정된 제품 검토' }),
    )
    expect(findAvailability).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('예약과 연결 일정이 수정되었습니다')
  })

  it('invalidates only the active availability query after an update succeeds', async () => {
    const invalidateQueries = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    const user = userEvent.setup()
    renderPage({
      isReservationUpdateAvailable: true,
      findAvailability: vi.fn().mockResolvedValue({ rooms }),
      getReservationForEdit: vi.fn().mockResolvedValue({
        reservationId: 10,
        roomId: 1,
        title: '제품 검토',
        startAt: '2026-08-07T09:00:00',
        endAt: '2026-08-07T10:00:00',
        attendeeIds: [],
        description: '',
        canEdit: true,
      }),
      updateReservation: vi.fn().mockResolvedValue({ reservationId: 10, scheduleId: 40 }),
    })

    await user.click(await screen.findByRole('button', { name: '제품 검토 수정' }))
    await user.type(screen.getByLabelText('참석자 ID'), '1')
    await user.click(screen.getByRole('button', { name: '참석자 추가' }))
    await user.click(screen.getByRole('button', { name: '예약 및 일정 수정' }))

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'meeting-room',
          {
            minimumCapacity: '',
            date: '2026-08-07',
            startTime: '09:00',
            endTime: '18:00',
            availabilityStatus: '',
          },
        ],
        exact: true,
      }),
    )
  })

  it('hides edit actions for a reservation the current user does not own', async () => {
    renderPage({
      isReservationCreationAvailable: true,
      isReservationUpdateAvailable: true,
      findAvailability: vi.fn().mockResolvedValue({
        rooms: [{ ...rooms[0], reservations: [{ ...rooms[0].reservations[0], canEdit: false }] }],
      }),
      createReservation: vi.fn(),
    })
    await screen.findByRole('heading', { name: '한강 회의실' })
    expect(screen.queryByRole('button', { name: '제품 검토 수정' })).not.toBeInTheDocument()
  })

  it('preserves edited input after an update conflict and offers reselection guidance', async () => {
    const user = userEvent.setup()
    renderPage({
      isReservationUpdateAvailable: true,
      findAvailability: vi.fn().mockResolvedValue({ rooms }),
      getReservationForEdit: vi.fn().mockResolvedValue({
        reservationId: 10,
        roomId: 1,
        title: '제품 검토',
        startAt: '2026-08-07T09:00:00',
        endAt: '2026-08-07T10:00:00',
        attendeeIds: [],
        description: '',
        canEdit: true,
      }),
      updateReservation: vi
        .fn()
        .mockRejectedValue(new MeetingRoomGatewayError('ROOM_RESERVATION_CONFLICT')),
    })
    await user.click(await screen.findByRole('button', { name: '제품 검토 수정' }))
    const panel = screen.getByRole('dialog', { name: '제품 검토 예약 수정' })
    await user.clear(within(panel).getByLabelText('예약 제목'))
    await user.type(within(panel).getByLabelText('예약 제목'), '내 입력 유지')
    await user.type(within(panel).getByLabelText('참석자 ID'), '1')
    await user.click(within(panel).getByRole('button', { name: '참석자 추가' }))
    await user.click(within(panel).getByRole('button', { name: '예약 및 일정 수정' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('다른 시간대를 선택')
    expect(within(panel).getByLabelText('예약 제목')).toHaveValue('내 입력 유지')
  })

  it('keeps production updates offline and explains that authentication integration is pending', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    await expect(
      productionMeetingRoomGateway.updateReservation?.({
        reservationId: 10,
        roomId: 1,
        title: '예약',
        startAt: '2026-08-07T09:00:00',
        endAt: '2026-08-07T10:00:00',
        attendeeIds: [],
        description: '',
      }),
    ).rejects.toMatchObject({ code: 'AUTH_INTEGRATION_PENDING' })
    expect(productionMeetingRoomGateway.isReservationUpdateAvailable).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps the production gateway offline until authentication integration exists', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    await expect(
      productionMeetingRoomGateway.findAvailability({ date: '2026-08-07' }),
    ).rejects.toMatchObject({ code: 'AUTH_INTEGRATION_PENDING' })
    await expect(
      productionMeetingRoomGateway.createReservation?.({
        roomId: 1,
        title: '예약',
        startAt: '2026-08-07T09:00:00',
        endAt: '2026-08-07T10:00:00',
        attendeeIds: [],
        description: '',
      }),
    ).rejects.toMatchObject({ code: 'AUTH_INTEGRATION_PENDING' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows an accessible loading state', () => {
    renderPage({
      findAvailability: vi.fn(() => new Promise<RoomAvailabilityResponse>(() => undefined)),
    })
    const loadingState = screen.getByRole('status')
    expect(loadingState).toHaveTextContent('회의실 정보를 불러오는 중입니다')
    expect(loadingState).toHaveAttribute('aria-live', 'polite')
  })

  it('shows rooms, default image, nine-to-eighteen timetable and text reservation details', async () => {
    renderPage({ findAvailability: vi.fn().mockResolvedValue({ rooms }) })
    expect(await screen.findByRole('heading', { name: '한강 회의실' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '한강 회의실 기본 이미지' })).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('18:00')).toBeInTheDocument()
    expect(screen.getAllByText('제품 검토')).not.toHaveLength(0)
    expect(screen.getAllByText('예약 팀: 제공되지 않음')).not.toHaveLength(0)
    expect(screen.getAllByText('상태: 예약 예정')).not.toHaveLength(0)
  })

  it('shows a distinct empty state when the available room list is empty', async () => {
    renderPage({ findAvailability: vi.fn().mockResolvedValue({ rooms: [] }) })
    expect(
      await screen.findByText('조회된 회의실이 없습니다. 검색 조건을 바꿔 다시 시도해 주세요.'),
    ).toBeInTheDocument()
  })

  it('offers all, available and reserved statuses and submits the selected filter', async () => {
    const findAvailability = vi.fn().mockResolvedValue({
      rooms,
    })
    const user = userEvent.setup()
    renderPage({ findAvailability })
    await screen.findByRole('heading', { name: '한강 회의실' })
    await user.clear(screen.getByLabelText('수용 인원'))
    await user.type(screen.getByLabelText('수용 인원'), '6')
    expect(within(screen.getByLabelText('예약 상태')).getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: '전체' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '예약 가능' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '예약중' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '예약 예정' })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('예약 상태'), 'RESERVED')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))
    expect(findAvailability).toHaveBeenLastCalledWith({
      date: '2026-08-07',
      startTime: '09:00',
      endTime: '18:00',
      minimumCapacity: 6,
      availabilityStatus: 'RESERVED',
    })
    expect(screen.queryByRole('heading', { name: '남산 회의실' })).not.toBeInTheDocument()
  })

  it('keeps valid rooms visible and offers retry after a request failure', async () => {
    const findAvailability = vi
      .fn()
      .mockResolvedValueOnce({ rooms })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ rooms })
    const user = userEvent.setup()
    renderPage({ findAvailability })
    await screen.findByRole('heading', { name: '한강 회의실' })
    await user.type(screen.getByLabelText('수용 인원'), '4')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('회의실 정보를 불러오지 못했습니다')
    expect(screen.getByRole('heading', { name: '한강 회의실' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('heading', { name: '한강 회의실' })).toBeInTheDocument()
  })

  it('shows the pending authentication state separately from empty rooms', async () => {
    renderPage({
      findAvailability: vi
        .fn()
        .mockRejectedValue(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('인증 연동이 준비 중입니다')
    expect(screen.queryByText('조회된 회의실이 없습니다.')).not.toBeInTheDocument()
  })

  it('opens an accessible reservation panel, validates required fields and restores focus after closing', async () => {
    const user = userEvent.setup()
    renderPage(reservationGateway())
    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    expect(screen.getByRole('dialog', { name: '한강 회의실 예약' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '한강 회의실 예약' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: '예약 및 일정 생성' }))
    expect(screen.getByText('예약 제목을 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('참석자를 한 명 이상 추가해 주세요.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('예약 제목'), '주간 회의')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    await user.click(screen.getByRole('button', { name: '입력 내용 삭제' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '한강 회의실 예약하기' })).toHaveFocus(),
    )
  })

  it('closes immediately after a successful reservation and shows the refreshed timetable', async () => {
    const user = userEvent.setup()
    renderPage(createDevelopmentMeetingRoomGateway())

    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    const panel = screen.getByRole('dialog', { name: '한강 회의실 예약' })
    await user.type(within(panel).getByLabelText('예약 제목'), '완료 후 표시 회의')
    await user.type(within(panel).getByLabelText('참석자 ID'), '1')
    await user.click(within(panel).getByRole('button', { name: '참석자 추가' }))
    await user.click(within(panel).getByRole('button', { name: '예약 및 일정 생성' }))
    expect(await within(panel).findByText('예약과 연결 일정이 생성되었습니다.')).toBeVisible()

    await user.click(within(panel).getByRole('button', { name: '닫기' }))

    expect(screen.queryByRole('dialog', { name: '한강 회의실 예약' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('alertdialog', { name: '입력 내용 삭제 확인' }),
    ).not.toBeInTheDocument()
    expect(await screen.findAllByText('완료 후 표시 회의')).not.toHaveLength(0)
  })

  it('deduplicates attendees, enforces capacity and prevents duplicate submissions', async () => {
    const createReservation = vi.fn(() => new Promise(() => undefined))
    const user = userEvent.setup()
    renderPage(reservationGateway(createReservation))
    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    const panel = within(screen.getByRole('dialog'))
    await user.type(panel.getByLabelText('예약 제목'), '주간 회의')
    await user.type(panel.getByLabelText('참석자 ID'), '1')
    await user.click(panel.getByRole('button', { name: '참석자 추가' }))
    await user.clear(panel.getByLabelText('종료 시간'))
    await user.type(panel.getByLabelText('종료 시간'), '09:00')
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))
    expect(screen.getByText('종료 시간은 시작 시간보다 늦어야 합니다.')).toBeInTheDocument()
    expect(panel.getByLabelText('종료 시간')).toHaveAttribute(
      'aria-describedby',
      'reservation-end-time-error',
    )
    await user.clear(panel.getByLabelText('종료 시간'))
    await user.type(panel.getByLabelText('종료 시간'), '10:00')
    for (const attendeeId of ['1', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      await user.clear(panel.getByLabelText('참석자 ID'))
      await user.type(panel.getByLabelText('참석자 ID'), attendeeId)
      await user.click(panel.getByRole('button', { name: '참석자 추가' }))
    }
    expect(screen.getByText('중복 참석자는 한 번만 추가됩니다.')).toBeInTheDocument()
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))
    expect(
      screen.getByText('참석자 수가 회의실 수용 인원(8명)을 초과했습니다.'),
    ).toBeInTheDocument()
    await user.click(panel.getByRole('button', { name: '참석자 9 제거' }))
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성 중' }))
    expect(createReservation).toHaveBeenCalledTimes(1)
    expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: 1,
        title: '주간 회의',
        attendeeIds: [1, 2, 3, 4, 5, 6, 7, 8],
      } satisfies Partial<CreateRoomReservationCommand>),
    )
  })

  it('shows conflict and authorization errors without claiming success, and can refresh availability', async () => {
    const createReservation = vi
      .fn()
      .mockRejectedValue(new MeetingRoomGatewayError('ROOM_RESERVATION_CONFLICT'))
    const findAvailability = vi.fn().mockResolvedValue({ rooms })
    const user = userEvent.setup()
    renderPage({ isReservationCreationAvailable: true, findAvailability, createReservation })
    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    await user.type(screen.getByLabelText('예약 제목'), '주간 회의')
    await user.type(screen.getByLabelText('참석자 ID'), '1')
    await user.click(screen.getByRole('button', { name: '참석자 추가' }))
    await user.click(screen.getByRole('button', { name: '예약 및 일정 생성' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 예약된 시간입니다')
    expect(screen.queryByText('예약과 연결 일정이 생성되었습니다.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '예약 현황 다시 조회' }))
    expect(findAvailability).toHaveBeenCalledTimes(2)
  })

  it('keeps production reservation submission disabled with an authentication pending reason', async () => {
    const user = userEvent.setup()
    renderPage({
      isReservationCreationAvailable: false,
      findAvailability: vi.fn().mockResolvedValue({ rooms }),
      createReservation: (command) =>
        productionMeetingRoomGateway.createReservation?.(command) ??
        Promise.reject(new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')),
    })
    await user.click(await screen.findByRole('button', { name: '인증 연동 대기 중' }))
    expect(screen.getByRole('dialog', { name: '한강 회의실 예약' })).toBeInTheDocument()
    expect(
      screen.getByText('인증 연동이 준비 중이어서 예약을 제출할 수 없습니다.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예약 및 일정 생성' })).toBeDisabled()
  })
})
