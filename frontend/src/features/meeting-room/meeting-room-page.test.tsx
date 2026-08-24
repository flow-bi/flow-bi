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

function renderPage(
  gateway: MeetingRoomGateway,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const testGateway: MeetingRoomGateway = {
    ...gateway,
    findAttendeeCandidates:
      gateway.findAttendeeCandidates ??
      ((query) =>
        Promise.resolve(
          Array.from({ length: 9 }, (_, index) => ({
            userId: index + 1,
            displayName: `테스트 사용자 ${index + 1}`,
          })).filter(({ displayName }) => displayName.includes(query)),
        )),
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <MeetingRoomPage gateway={testGateway} initialDate="2026-08-07" />
    </QueryClientProvider>,
  )
}

async function selectAttendee(
  user: ReturnType<typeof userEvent.setup>,
  attendeeId = 1,
  container?: HTMLElement,
) {
  const displayName = `테스트 사용자 ${attendeeId}`
  const scope = container ? within(container) : screen
  await user.type(scope.getByLabelText('참석자 검색'), displayName)
  await user.click(scope.getByRole('button', { name: `${displayName} 참석자로 추가` }))
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
  it('searches attendees by name and submits only selected internal IDs', async () => {
    const findAttendeeCandidates = vi
      .fn()
      .mockResolvedValue([{ userId: 21, displayName: '김하늘' }])
    const createReservation = vi.fn().mockResolvedValue({ reservationId: 30, scheduleId: 40 })
    const user = userEvent.setup()
    renderPage({
      isReservationCreationAvailable: true,
      findAvailability: vi.fn().mockResolvedValue({ rooms }),
      findAttendeeCandidates,
      createReservation,
    })

    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    expect(screen.queryByLabelText('참석자 ID')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '등록자도 참석' })).not.toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: '등록자도 참석' }))
    await user.type(screen.getByLabelText('참석자 검색'), '  김하늘  ')
    expect(await screen.findByRole('button', { name: '김하늘 참석자로 추가' })).toBeVisible()
    expect(findAttendeeCandidates).toHaveBeenCalledWith('김하늘')
    await user.click(screen.getByRole('button', { name: '김하늘 참석자로 추가' }))
    await user.type(screen.getByLabelText('예약 제목'), '이름 검색 회의')
    await user.click(screen.getByRole('button', { name: '예약 및 일정 생성' }))
    await waitFor(() => expect(createReservation).toHaveBeenCalledTimes(1))
    expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ creatorAttends: true, attendeeIds: [21] }),
    )
  })

  it('creates a reservation with only the authenticated creator attending', async () => {
    const createReservation = vi.fn().mockResolvedValue({ reservationId: 30, scheduleId: 40 })
    const user = userEvent.setup()
    renderPage(reservationGateway(createReservation))

    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    await user.type(screen.getByLabelText('예약 제목'), '혼자 사용')
    await user.click(screen.getByRole('checkbox', { name: '등록자도 참석' }))
    await user.click(screen.getByRole('button', { name: '예약 및 일정 생성' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledTimes(1))
    expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ creatorAttends: true, attendeeIds: [] }),
    )
  })

  it('uses an injected gateway only in a test harness', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    const injectedFindAvailability = vi.fn().mockResolvedValue({ rooms: [] })
    const injectedGateway: MeetingRoomGateway = {
      findAvailability: injectedFindAvailability,
    }

    await expect(
      resolveMeetingRoomGateway({
        isTestHarness: false,
        injectedGateway,
      }).findAvailability({ date: '2026-08-07' }),
    ).rejects.toMatchObject({ code: 'AUTH_INTEGRATION_PENDING' })
    expect(injectedFindAvailability).not.toHaveBeenCalled()

    await resolveMeetingRoomGateway({
      isTestHarness: true,
      injectedGateway,
    }).findAvailability({ date: '2026-08-07' })
    expect(injectedFindAvailability).toHaveBeenCalledTimes(1)
  })

  it('loads owned reservation values, updates its connected schedule, and refreshes only room availability', async () => {
    const updateReservation = vi.fn().mockResolvedValue({ reservationId: 10, scheduleId: 40 })
    const findAvailability = vi.fn().mockResolvedValue({ rooms })
    const getReservationForEdit = vi.fn().mockResolvedValue({
      reservationId: 10,
      roomId: 1,
      title: '제품 검토',
      startAt: '2026-08-07T09:00:00',
      endAt: '2026-08-07T10:00:00',
      creatorAttends: true,
      attendeeIds: [1],
      attendees: [{ userId: 1, displayName: '김하늘' }],
      description: '초기 설명',
      canEdit: true,
    })
    const user = userEvent.setup()
    renderPage({
      isReservationCreationAvailable: true,
      isReservationUpdateAvailable: true,
      findAvailability,
      createReservation: vi.fn(),
      getReservationForEdit,
      updateReservation,
    })
    const editButton = await screen.findByRole('button', { name: '예약 수정: 제품 검토' })
    expect(editButton).toHaveTextContent('예약 수정')
    await user.click(editButton)
    expect(getReservationForEdit).toHaveBeenCalledWith(10)
    const panel = screen.getByRole('dialog', { name: '제품 검토 예약 수정' })
    expect(within(panel).getByLabelText('예약 제목')).toHaveValue('제품 검토')
    expect(within(panel).getByLabelText('상세 설명')).toHaveValue('초기 설명')
    expect(within(panel).getByRole('checkbox', { name: '등록자도 참석' })).toBeChecked()
    expect(within(panel).getByRole('button', { name: '김하늘 제거' })).toBeVisible()
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

    await user.click(await screen.findByRole('button', { name: '예약 수정: 제품 검토' }))
    await selectAttendee(user)
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
    expect(screen.queryByRole('button', { name: /예약 수정/ })).not.toBeInTheDocument()
  })

  it('confirms cancellation for an owned reservation, prevents duplicate submission, and refreshes room and calendar queries', async () => {
    const cancelReservation = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 10)))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const user = userEvent.setup()
    renderPage(
      {
        isReservationCancellationAvailable: true,
        findAvailability: vi.fn().mockResolvedValue({ rooms }),
        cancelReservation,
      },
      queryClient,
    )

    const trigger = await screen.findByRole('button', { name: '예약 취소: 제품 검토' })
    await user.click(trigger)
    const dialog = screen.getByRole('alertdialog', { name: '제품 검토 예약 취소 확인' })
    expect(dialog).toHaveTextContent('한강 회의실')
    expect(dialog).toHaveTextContent('09:00–10:00')
    expect(within(dialog).getByRole('button', { name: '예약 취소 실행' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: '예약 취소 실행' }))
    await user.click(within(dialog).getByRole('button', { name: '예약 취소 중' }))
    await waitFor(() => expect(cancelReservation).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('취소'))
    await waitFor(() => expect(document.getElementById('room-reserve-1')).toHaveFocus())
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['meeting-room', expect.any(Object)],
      exact: true,
    })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['schedules'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['schedule-detail'] })
  })

  it('does not expose cancellation for a reservation the current user does not own', async () => {
    renderPage({
      isReservationCancellationAvailable: true,
      findAvailability: vi.fn().mockResolvedValue({
        rooms: [{ ...rooms[0], reservations: [{ ...rooms[0].reservations[0], canEdit: false }] }],
      }),
    })

    await screen.findByRole('heading', { name: '한강 회의실' })
    expect(screen.queryByRole('button', { name: /예약 취소/ })).not.toBeInTheDocument()
  })

  it('keeps keyboard focus inside the cancellation confirmation dialog', async () => {
    const user = userEvent.setup()
    renderPage({
      isReservationCancellationAvailable: true,
      findAvailability: vi.fn().mockResolvedValue({ rooms }),
      cancelReservation: vi.fn(),
    })

    await user.click(await screen.findByRole('button', { name: '예약 취소: 제품 검토' }))
    const dialog = screen.getByRole('alertdialog')
    const closeButton = within(dialog).getByRole('button', { name: '닫기' })
    const cancelButton = within(dialog).getByRole('button', { name: '예약 취소 실행' })

    expect(cancelButton).toHaveFocus()
    await user.tab()
    expect(closeButton).toHaveFocus()
    await user.tab({ shift: true })
    expect(cancelButton).toHaveFocus()
  })

  it.each([
    ['AUTH_INTEGRATION_PENDING', '다시 로그인한 뒤 예약 취소를 다시 시도해 주세요.'],
    ['ROOM_RESERVATION_NOT_FOUND', '예약 취소 권한이 없거나 이미 사용할 수 없는 예약입니다.'],
    [
      'ROOM_RESERVATION_CANCEL_CONFLICT',
      '예약 상태가 변경되었습니다. 최신 예약 현황을 다시 조회한 뒤 시도해 주세요.',
    ],
  ])(
    'keeps the dialog open with an actionable cancellation error for %s',
    async (code, message) => {
      const user = userEvent.setup()
      renderPage({
        isReservationCancellationAvailable: true,
        findAvailability: vi.fn().mockResolvedValue({ rooms }),
        cancelReservation: vi.fn().mockRejectedValue(new MeetingRoomGatewayError(code as never)),
      })
      await user.click(await screen.findByRole('button', { name: '예약 취소: 제품 검토' }))
      await user.click(screen.getByRole('button', { name: '예약 취소 실행' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    },
  )

  it('refreshes the current availability after a cancellation conflict before retrying', async () => {
    const findAvailability = vi
      .fn()
      .mockResolvedValueOnce({ rooms })
      .mockResolvedValueOnce({ rooms: [{ ...rooms[0], reservations: [] }] })
    const user = userEvent.setup()
    renderPage({
      isReservationCancellationAvailable: true,
      findAvailability,
      cancelReservation: vi
        .fn()
        .mockRejectedValue(new MeetingRoomGatewayError('ROOM_RESERVATION_CANCEL_CONFLICT')),
    })

    await user.click(await screen.findByRole('button', { name: '예약 취소: 제품 검토' }))
    await user.click(screen.getByRole('button', { name: '예약 취소 실행' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: '최신 예약 현황 조회' }))

    await waitFor(() => expect(findAvailability).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '예약 취소: 제품 검토' })).not.toBeInTheDocument()
    await waitFor(() => expect(document.getElementById('room-reserve-1')).toHaveFocus())
  })

  it('keeps the dialog open and offers retry after a network cancellation error', async () => {
    const user = userEvent.setup()
    renderPage({
      isReservationCancellationAvailable: true,
      findAvailability: vi.fn().mockResolvedValue({ rooms }),
      cancelReservation: vi.fn().mockRejectedValue(new Error('network offline')),
    })
    await user.click(await screen.findByRole('button', { name: '예약 취소: 제품 검토' }))
    await user.click(screen.getByRole('button', { name: '예약 취소 실행' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('네트워크 오류')
    expect(screen.getByRole('button', { name: '예약 취소 실행' })).toBeEnabled()
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
    await user.click(await screen.findByRole('button', { name: '예약 수정: 제품 검토' }))
    const panel = screen.getByRole('dialog', { name: '제품 검토 예약 수정' })
    await user.clear(within(panel).getByLabelText('예약 제목'))
    await user.type(within(panel).getByLabelText('예약 제목'), '내 입력 유지')
    await selectAttendee(user, 1, panel)
    await user.click(within(panel).getByRole('button', { name: '예약 및 일정 수정' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('다른 시간대를 선택')
    expect(within(panel).getByLabelText('예약 제목')).toHaveValue('내 입력 유지')
  })

  it('maps the no-authentication production response to the pending integration state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
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
    expect(productionMeetingRoomGateway.isReservationUpdateAvailable).toBe(true)
  })

  it('safely rejects unauthenticated production availability and creation requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
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

  it('blocks non-ten-minute search times and applies valid keyboard-entered times', async () => {
    const findAvailability = vi.fn().mockResolvedValue({ rooms })
    const user = userEvent.setup()
    renderPage({ findAvailability })
    await screen.findByRole('heading', { name: '한강 회의실' })

    const startTime = screen.getByLabelText('시작 시간')
    expect(startTime).toHaveAttribute('step', '600')
    await user.clear(startTime)
    await user.type(startTime, '10:03')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))

    expect(findAvailability).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent(
      '시간은 10분 단위로 입력해 주세요. 예: 10:10',
    )
    expect(startTime).toHaveAttribute('aria-invalid', 'true')
    expect(startTime).toHaveAttribute('aria-describedby', 'search-start-time-error')

    await user.clear(startTime)
    await user.type(startTime, '10:10')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))

    expect(findAvailability).toHaveBeenLastCalledWith({
      date: '2026-08-07',
      startTime: '10:10',
      endTime: '18:00',
    })
  })

  it('starts a new reservation from the last applied search date and times', async () => {
    const createReservation = vi.fn().mockResolvedValue({ reservationId: 30, scheduleId: 40 })
    const user = userEvent.setup()
    renderPage(reservationGateway(createReservation))
    await screen.findByRole('heading', { name: '한강 회의실' })

    await user.clear(screen.getByLabelText('날짜'))
    await user.type(screen.getByLabelText('날짜'), '2026-08-12')
    await user.clear(screen.getByLabelText('시작 시간'))
    await user.type(screen.getByLabelText('시작 시간'), '10:10')
    await user.clear(screen.getByLabelText('종료 시간'))
    await user.type(screen.getByLabelText('종료 시간'), '11:20')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))
    await waitFor(() => expect(createReservation).not.toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: '한강 회의실 예약하기' }))
    const panel = within(screen.getByRole('dialog', { name: '한강 회의실 예약' }))
    expect(panel.getByLabelText('날짜')).toHaveValue('2026-08-12')
    expect(panel.getByLabelText('시작 시간')).toHaveValue('10:10')
    expect(panel.getByLabelText('종료 시간')).toHaveValue('11:20')
    await user.type(panel.getByLabelText('예약 제목'), '검색 조건 회의')
    await selectAttendee(user)
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))

    await waitFor(() =>
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          startAt: '2026-08-12T10:10:00',
          endAt: '2026-08-12T11:20:00',
        }),
      ),
    )
  })

  it('does not mix unapplied search or discarded panel values into the next reservation defaults', async () => {
    const findAvailability = vi.fn().mockResolvedValue({ rooms })
    const user = userEvent.setup()
    renderPage({
      isReservationCreationAvailable: true,
      findAvailability,
      createReservation: vi.fn(),
    })
    await screen.findByRole('heading', { name: '한강 회의실' })

    await user.clear(screen.getByLabelText('시작 시간'))
    await user.type(screen.getByLabelText('시작 시간'), '10:10')
    await user.clear(screen.getByLabelText('종료 시간'))
    await user.type(screen.getByLabelText('종료 시간'), '11:20')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))
    await waitFor(() => expect(findAvailability).toHaveBeenCalledTimes(2))
    await user.click(screen.getByRole('button', { name: '한강 회의실 예약하기' }))
    const firstPanel = within(screen.getByRole('dialog', { name: '한강 회의실 예약' }))
    await user.clear(firstPanel.getByLabelText('시작 시간'))
    await user.type(firstPanel.getByLabelText('시작 시간'), '12:30')
    await user.click(screen.getByTestId('reservation-panel-overlay'))
    await user.click(screen.getByRole('button', { name: '입력 내용 삭제' }))

    await user.clear(screen.getByLabelText('시작 시간'))
    await user.type(screen.getByLabelText('시작 시간'), '13:40')
    await user.click(screen.getByRole('button', { name: '한강 회의실 예약하기' }))
    const panel = within(screen.getByRole('dialog', { name: '한강 회의실 예약' }))
    expect(panel.getByLabelText('시작 시간')).toHaveValue('10:10')
    expect(panel.getByLabelText('종료 시간')).toHaveValue('11:20')

    const searchSubmit = screen.getByRole('button', { name: '검색 적용' })
    const searchForm = searchSubmit.closest('form')
    if (!searchForm) {
      throw new Error('검색 폼을 찾을 수 없습니다.')
    }
    await user.clear(within(searchForm).getByLabelText('종료 시간'))
    await user.type(within(searchForm).getByLabelText('종료 시간'), '14:40')
    await user.click(searchSubmit)
    await waitFor(() =>
      expect(findAvailability).toHaveBeenLastCalledWith({
        date: '2026-08-07',
        startTime: '13:40',
        endTime: '14:40',
      }),
    )
    expect(panel.getByLabelText('시작 시간')).toHaveValue('10:10')
    expect(panel.getByLabelText('종료 시간')).toHaveValue('11:20')
    await user.click(screen.getByTestId('reservation-panel-overlay'))

    await user.click(screen.getByRole('button', { name: '한강 회의실 예약하기' }))
    const reappliedPanel = within(screen.getByRole('dialog', { name: '한강 회의실 예약' }))
    expect(reappliedPanel.getByLabelText('시작 시간')).toHaveValue('13:40')
    expect(reappliedPanel.getByLabelText('종료 시간')).toHaveValue('14:40')
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

  it('closes a clean create panel only when its overlay is clicked and restores the reserve trigger focus', async () => {
    const user = userEvent.setup()
    renderPage(reservationGateway())
    const reserveButton = await screen.findByRole('button', { name: '한강 회의실 예약하기' })
    await user.click(reserveButton)

    const panel = screen.getByRole('dialog', { name: '한강 회의실 예약' })
    await user.click(within(panel).getByLabelText('예약 제목'))
    expect(panel).toBeInTheDocument()

    await user.click(screen.getByTestId('reservation-panel-overlay'))
    expect(screen.queryByRole('dialog', { name: '한강 회의실 예약' })).not.toBeInTheDocument()
    await waitFor(() => expect(reserveButton).toHaveFocus())
  })

  it('protects changed create and update panel input when their overlays are clicked', async () => {
    const user = userEvent.setup()
    renderPage({
      ...reservationGateway(),
      isReservationUpdateAvailable: true,
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
      updateReservation: vi.fn(),
    })

    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    await user.type(screen.getByLabelText('예약 제목'), '생성 입력')
    await user.click(screen.getByTestId('reservation-panel-overlay'))
    expect(screen.getByRole('alertdialog', { name: '입력 내용 삭제 확인' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '한강 회의실 예약' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '입력 내용 삭제' }))

    const editButton = await screen.findByRole('button', { name: '예약 수정: 제품 검토' })
    await user.click(editButton)
    await user.clear(screen.getByLabelText('예약 제목'))
    await user.type(screen.getByLabelText('예약 제목'), '수정 입력')
    await user.click(screen.getByTestId('reservation-panel-overlay'))
    expect(screen.getByRole('alertdialog', { name: '입력 내용 삭제 확인' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '입력 내용 삭제' }))
    await waitFor(() => expect(editButton).toHaveFocus())
  })

  it('closes immediately after a successful reservation and shows the refreshed timetable', async () => {
    const user = userEvent.setup()
    renderPage(createDevelopmentMeetingRoomGateway())

    await user.clear(screen.getByLabelText('시작 시간'))
    await user.type(screen.getByLabelText('시작 시간'), '11:00')
    await user.clear(screen.getByLabelText('종료 시간'))
    await user.type(screen.getByLabelText('종료 시간'), '12:00')
    await user.click(screen.getByRole('button', { name: '검색 적용' }))
    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    const panel = screen.getByRole('dialog', { name: '한강 회의실 예약' })
    await user.type(within(panel).getByLabelText('예약 제목'), '완료 후 표시 회의')
    await user.type(within(panel).getByLabelText('참석자 검색'), '김하늘')
    await user.click(within(panel).getByRole('button', { name: '김하늘 참석자로 추가' }))
    await user.click(within(panel).getByRole('button', { name: '예약 및 일정 생성' }))
    expect(await within(panel).findByText('예약과 연결 일정이 생성되었습니다.')).toBeVisible()

    await user.click(screen.getByTestId('reservation-panel-overlay'))

    expect(screen.queryByRole('dialog', { name: '한강 회의실 예약' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('alertdialog', { name: '입력 내용 삭제 확인' }),
    ).not.toBeInTheDocument()
    expect(await screen.findAllByText('완료 후 표시 회의')).not.toHaveLength(0)
  })

  it('invalidates the active availability and cached calendar list after creation without inserting schedule data', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData(['schedules', '2026-08-01', '2026-08-31'], [{ id: 9 }])
    const user = userEvent.setup()
    renderPage(reservationGateway(), queryClient)

    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    invalidateQueries.mockClear()
    const panel = within(screen.getByRole('dialog', { name: '한강 회의실 예약' }))
    await user.type(panel.getByLabelText('예약 제목'), '캘린더 갱신 회의')
    await selectAttendee(user)
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['schedules'] }))
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
    })
    expect(queryClient.getQueryData(['schedules', '2026-08-01', '2026-08-31'])).toEqual([{ id: 9 }])
  })

  it('keeps cached calendar data and reservation input when creation fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData(['schedules', '2026-08-01', '2026-08-31'], [{ id: 9 }])
    const user = userEvent.setup()
    renderPage(
      reservationGateway(
        vi.fn().mockRejectedValue(new MeetingRoomGatewayError('ROOM_RESERVATION_CONFLICT')),
      ),
      queryClient,
    )

    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    invalidateQueries.mockClear()
    const panel = within(screen.getByRole('dialog', { name: '한강 회의실 예약' }))
    await user.type(panel.getByLabelText('예약 제목'), '실패 후 재시도 회의')
    await selectAttendee(user)
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))

    expect(await panel.findByRole('alert')).toHaveTextContent('다른 시간대를 선택')
    expect(panel.getByLabelText('예약 제목')).toHaveValue('실패 후 재시도 회의')
    expect(queryClient.getQueryData(['schedules', '2026-08-01', '2026-08-31'])).toEqual([{ id: 9 }])
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('deduplicates attendees, enforces capacity and prevents duplicate submissions', async () => {
    const createReservation = vi.fn(() => new Promise(() => undefined))
    const user = userEvent.setup()
    renderPage(reservationGateway(createReservation))
    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    const panel = within(screen.getByRole('dialog'))
    await user.type(panel.getByLabelText('예약 제목'), '주간 회의')
    await selectAttendee(user)
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
    for (const attendeeId of [1, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      await user.clear(panel.getByLabelText('참석자 검색'))
      await selectAttendee(user, attendeeId)
    }
    expect(screen.getByText('중복 참석자는 한 번만 추가됩니다.')).toBeInTheDocument()
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))
    expect(
      screen.getByText('참석자 수가 회의실 수용 인원(8명)을 초과했습니다.'),
    ).toBeInTheDocument()
    await user.click(panel.getByRole('button', { name: '테스트 사용자 9 제거' }))
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

  it('blocks non-ten-minute reservation times and creates with valid keyboard-entered times', async () => {
    const createReservation = vi.fn().mockResolvedValue({ reservationId: 30, scheduleId: 40 })
    const user = userEvent.setup()
    renderPage(reservationGateway(createReservation))
    await user.click(await screen.findByRole('button', { name: '한강 회의실 예약하기' }))
    const panel = within(screen.getByRole('dialog'))
    await user.type(panel.getByLabelText('예약 제목'), '주간 회의')
    await selectAttendee(user)
    const startTime = panel.getByLabelText('시작 시간')
    expect(startTime).toHaveAttribute('step', '600')
    await user.clear(panel.getByLabelText('종료 시간'))
    await user.type(panel.getByLabelText('종료 시간'), '10:20')
    await user.clear(startTime)
    await user.type(startTime, '10:03')
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))

    expect(createReservation).not.toHaveBeenCalled()
    expect(screen.getByText('시간은 10분 단위로 입력해 주세요. 예: 10:10')).toBeInTheDocument()
    expect(startTime).toHaveAttribute('aria-invalid', 'true')
    expect(startTime).toHaveAttribute('aria-describedby', 'reservation-start-time-error')

    await user.clear(startTime)
    await user.type(startTime, '10:10')
    await user.click(panel.getByRole('button', { name: '예약 및 일정 생성' }))

    await waitFor(() => expect(createReservation).toHaveBeenCalledTimes(1))
    expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ startAt: '2026-08-07T10:10:00' }),
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
    await selectAttendee(user)
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
