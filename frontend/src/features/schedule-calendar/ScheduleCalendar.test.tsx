import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ScheduleCalendar } from './ScheduleCalendar'

import type { ScheduleDetail, ScheduleSummary } from './api/scheduleCalendarApi'

const schedules: ScheduleSummary[] = [
  {
    id: 1,
    title: '종일 개인 일정',
    startAt: '2024-02-29T00:00:00+09:00',
    endAt: '2024-03-01T00:00:00+09:00',
    allDay: true,
    type: 'PERSONAL',
    colorLabel: 'BLUE',
  },
  {
    id: 2,
    title: '기간을 넘는 팀 회의',
    startAt: '2024-02-29T23:00:00+09:00',
    endAt: '2024-03-01T01:00:00+09:00',
    allDay: false,
    type: 'TEAM',
    colorLabel: 'ORANGE',
  },
]

const roomManagedDetail: ScheduleDetail = {
  ...schedules[1],
  visibility: 'TEAM',
  content: '회의실 예약으로 생성된 일정',
  location: '회의실 A',
  creatorAttends: true,
  participantIds: [2, 3],
  participants: [
    { userId: 2, displayName: '김하늘' },
    { userId: 3, displayName: '이바다' },
  ],
  attendeeCount: 3,
  userTargetIds: [],
  teamTargetIds: [10],
  projectTargetIds: [],
  meetingRoomManaged: true,
  canManage: false,
  roomReservationId: null,
  canCancelRoomReservation: false,
}

const editableDetail: ScheduleDetail = {
  ...roomManagedDetail,
  id: 3,
  title: '수정할 개인 일정',
  startAt: '2024-02-29T09:00:00+09:00',
  endAt: '2024-02-29T10:00:00+09:00',
  type: 'PERSONAL',
  visibility: 'PRIVATE',
  meetingRoomManaged: false,
  canManage: true,
  userTargetIds: [8],
  teamTargetIds: [],
}

function renderCalendar(props: Partial<React.ComponentProps<typeof ScheduleCalendar>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ScheduleCalendar
        getScheduleDetail={() => Promise.resolve(roomManagedDetail)}
        getSchedules={() => Promise.resolve(schedules)}
        now={() => new Date('2024-02-15T12:00:00+09:00')}
        {...props}
      />
    </QueryClientProvider>,
  )
}

describe('ScheduleCalendar', () => {
  it('announces target loading and lets a screen-reader user retry a failed target lookup', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const teamDetail = {
      ...roomManagedDetail,
      id: 4,
      title: '대상 목록을 확인할 팀 회의',
      meetingRoomManaged: false,
      canManage: true,
    }
    let rejectTargetOptions: ((reason?: unknown) => void) | undefined
    const getTargetOptions = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ teams: Array<{ id: number; name: string }>; projects: [] }>(
            (_resolve, reject) => (rejectTargetOptions = reject),
          ),
      )
      .mockResolvedValueOnce({ teams: [{ id: 10, name: '플랫폼팀' }], projects: [] })
    const user = userEvent.setup()
    renderCalendar({
      getScheduleDetail: () => Promise.resolve(teamDetail),
      getSchedules: () => Promise.resolve([teamDetail]),
      getTargetOptions,
    })

    await user.click(await screen.findByRole('button', { name: /대상 목록을 확인할 팀 회의/ }))
    await user.click(await screen.findByRole('button', { name: '일정 수정' }))
    expect(screen.getByRole('status')).toHaveTextContent('일정 대상 목록을 불러오고 있습니다.')

    rejectTargetOptions?.(new Error('offline'))
    expect(
      await screen.findByText('일정 대상 목록을 불러오지 못했습니다. 다시 시도해 주세요.'),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: '대상 목록 다시 시도' }))
    expect(await screen.findByRole('checkbox', { name: '플랫폼팀' })).toBeChecked()
    expect(getTargetOptions).toHaveBeenCalledTimes(2)
  })

  it('announces the empty named target list to screen readers', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const teamDetail = {
      ...roomManagedDetail,
      id: 5,
      title: '대상이 없는 팀 회의',
      meetingRoomManaged: false,
      canManage: true,
    }
    const user = userEvent.setup()
    renderCalendar({
      getScheduleDetail: () => Promise.resolve(teamDetail),
      getSchedules: () => Promise.resolve([teamDetail]),
      getTargetOptions: () => Promise.resolve({ teams: [], projects: [] }),
    })

    await user.click(await screen.findByRole('button', { name: /대상이 없는 팀 회의/ }))
    await user.click(await screen.findByRole('button', { name: '일정 수정' }))
    expect(await screen.findByRole('status')).toHaveTextContent('선택 가능한 팀이 없습니다.')
  })

  it('shows attendee count, named participants, creator attendance, and an empty attendee state without raw IDs', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const detail = {
      ...roomManagedDetail,
      participants: [
        { userId: 2, displayName: '김하늘' },
        { userId: 3, displayName: '이바다' },
      ],
      attendeeCount: 3,
    }
    const user = userEvent.setup()
    renderCalendar({ getScheduleDetail: () => Promise.resolve(detail) })

    await user.click(await screen.findByRole('button', { name: /기간을 넘는 팀 회의/ }))
    const modal = await screen.findByRole('dialog', { name: '기간을 넘는 팀 회의' })
    expect(within(modal).getByText('참석 인원: 3명')).toBeVisible()
    expect(within(modal).getByText('등록자 참석: 예')).toBeVisible()
    expect(within(modal).getByText('김하늘')).toBeVisible()
    expect(within(modal).getByText('이바다')).toBeVisible()
    expect(within(modal).queryByText('2')).not.toBeInTheDocument()
    expect(within(modal).queryByText('3')).not.toBeInTheDocument()
  })

  it('edits team attendees by name, removes them accessibly, and clears them when changed to personal', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const teamDetail = {
      ...roomManagedDetail,
      id: 4,
      title: '수정할 팀 회의',
      meetingRoomManaged: false,
      canManage: true,
    }
    const updateSchedule = vi.fn(() => Promise.resolve(teamDetail))
    const user = userEvent.setup()
    renderCalendar({
      getScheduleDetail: () => Promise.resolve(teamDetail),
      getSchedules: () => Promise.resolve([teamDetail]),
      getTargetOptions: () =>
        Promise.resolve({
          teams: [
            { id: 10, name: '플랫폼팀' },
            { id: 11, name: '디자인팀' },
          ],
          projects: [],
        }),
      searchAttendees: () => Promise.resolve([{ userId: 4, displayName: '박민지' }]),
      updateSchedule,
    })

    await user.click(await screen.findByRole('button', { name: /수정할 팀 회의/ }))
    await user.click(await screen.findByRole('button', { name: '일정 수정' }))
    expect(screen.getByTestId('schedule-edit-form-grid')).toHaveClass('sm:grid-cols-3')
    expect(screen.getByLabelText('위치')).toHaveClass('rounded-md', 'border-border', 'px-3', 'py-2')
    expect(screen.queryByLabelText('팀 대상 ID')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: '팀 대상' })).toBeVisible()
    expect(await screen.findByRole('checkbox', { name: '플랫폼팀' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: '디자인팀' }))
    expect(screen.getByRole('checkbox', { name: '디자인팀' })).toBeChecked()
    expect(screen.getByRole('list', { name: '선택된 참석자' })).toHaveTextContent('김하늘')
    expect(screen.queryByLabelText('참석자 ID')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('참석자 검색'), '민지')
    await user.click(await screen.findByRole('button', { name: '박민지 참석자로 추가' }))
    await user.click(screen.getByRole('button', { name: '김하늘 참석자 제거' }))
    expect(screen.getByRole('list', { name: '선택된 참석자' })).toHaveTextContent('박민지')

    await user.selectOptions(screen.getByLabelText('일정 유형'), 'PERSONAL')
    expect(
      await screen.findByText(
        '개인 일정은 등록자 전용이므로 참석자와 사용자 공유 대상을 제거했습니다.',
      ),
    ).toBeVisible()
    expect(screen.queryByLabelText('참석자 검색')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('일정 유형'), 'TEAM')
    expect(screen.queryByText('박민지')).not.toBeInTheDocument()
    expect(updateSchedule).not.toHaveBeenCalled()
  })

  it('shows the explicit empty state when no other attendees are present', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const detail = {
      ...editableDetail,
      participantIds: [],
      participants: [],
      attendeeCount: 0,
      creatorAttends: false,
    }
    const user = userEvent.setup()
    renderCalendar({ getScheduleDetail: () => Promise.resolve(detail) })

    await user.click(await screen.findByRole('button', { name: /기간을 넘는 팀 회의/ }))
    expect(await screen.findByText('다른 참석자가 없습니다.')).toBeVisible()
    expect(screen.getByText('참석 인원: 0명')).toBeVisible()
    expect(screen.getByText('등록자 참석: 아니요')).toBeVisible()
  })

  it('exposes Tailwind-styled calendar regions through stable hooks', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-15')
    renderCalendar()

    expect(await screen.findByTestId('calendar-header')).toHaveClass(
      'flex',
      'flex-col',
      'sm:flex-row',
    )
    expect(screen.getByTestId('calendar-view-controls')).toHaveClass('flex-wrap')
    expect(await screen.findByTestId('calendar-grid')).toHaveClass('grid', 'grid-cols-7')
    expect(screen.getByTestId('calendar-weekday-일')).toHaveClass('bg-secondary')
    const chip = screen.getByTestId('calendar-schedule-chip-1')
    expect(chip).toHaveClass('bg-blue-100', 'border-blue-300', 'text-blue-950')
    expect(chip).toHaveTextContent('종일 개인 일정 · 개인')
    expect(chip).not.toHaveTextContent('2024년 2월 29일')
    expect(chip).not.toHaveTextContent('BLUE')
  })

  it('lets the creator edit a normal schedule and updates only its list and detail queries', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const updateSchedule = vi.fn((_: number, request: { title: string }) =>
      Promise.resolve({ ...editableDetail, title: request.title }),
    )
    const user = userEvent.setup()
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...editableDetail }]),
      getScheduleDetail: () => Promise.resolve(editableDetail),
      updateSchedule,
    })

    await user.click(
      await screen.findByRole('button', { name: /수정할 개인 일정/ }, { timeout: 5_000 }),
    )
    await user.click(await screen.findByRole('button', { name: '일정 수정' }, { timeout: 5_000 }))
    const title = screen.getByLabelText('제목')
    expect(title).toHaveValue('수정할 개인 일정')
    await user.clear(title)
    await user.click(screen.getByRole('button', { name: '수정 저장' }))
    expect(await screen.findByText('제목을 입력해 주세요.')).toBeVisible()

    await user.type(title, '변경된 일정')
    await user.click(screen.getByRole('button', { name: '수정 저장' }))
    expect(updateSchedule).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        title: '변경된 일정',
        participantIds: [],
        userTargetIds: [],
        teamTargetIds: [],
        projectTargetIds: [],
      }),
    )
    expect(await screen.findByRole('dialog', { name: '변경된 일정' })).toBeVisible()
  }, 10_000)

  it('sends an all-day edit as a complete [start, end) day', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const updateSchedule = vi.fn(() => Promise.resolve(editableDetail))
    const user = userEvent.setup()
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...editableDetail }]),
      getScheduleDetail: () => Promise.resolve(editableDetail),
      updateSchedule,
    })

    await user.click(
      await screen.findByRole('button', { name: /수정할 개인 일정/ }, { timeout: 5_000 }),
    )
    await user.click(await screen.findByRole('button', { name: '일정 수정' }, { timeout: 5_000 }))
    await user.click(screen.getByLabelText('하루종일'))
    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    expect(updateSchedule).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        startAt: '2024-02-29T00:00:00+09:00',
        endAt: '2024-03-01T00:00:00+09:00',
        allDay: true,
      }),
    )
  }, 10_000)

  it('asks before cancellation, removes a cancelled schedule, and restores focus', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const cancelSchedule = vi.fn(() => Promise.resolve())
    const user = userEvent.setup()
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...editableDetail }]),
      getScheduleDetail: () => Promise.resolve(editableDetail),
      cancelSchedule,
    })
    const chip = await screen.findByRole('button', { name: /수정할 개인 일정/ })
    await user.click(chip)
    await user.click(await screen.findByRole('button', { name: '일정 취소' }))
    expect(screen.getByRole('alertdialog', { name: '수정할 개인 일정 취소' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '일정 취소 확정' }))
    expect(cancelSchedule).toHaveBeenCalledWith(3)
    expect(await screen.findByText('일정이 취소되었습니다.')).toBeVisible()
    expect(screen.queryByRole('dialog', { name: '수정할 개인 일정' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2024년 2월 29일 일정 보기' })).toHaveFocus()
  })

  it('only exposes room reservation cancellation to its owner and preserves normal schedule actions', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    const ownedRoomReservation = {
      ...roomManagedDetail,
      roomReservationId: 17,
      canCancelRoomReservation: true,
    }
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...roomManagedDetail }]),
      getScheduleDetail: () => Promise.resolve(ownedRoomReservation),
    })

    await user.click(await screen.findByRole('button', { name: /기간을 넘는 팀 회의/ }))
    expect(await screen.findByRole('button', { name: '예약 취소' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '일정 취소' })).not.toBeInTheDocument()

    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...roomManagedDetail }]),
      getScheduleDetail: () => Promise.resolve(roomManagedDetail),
    })
    await user.click((await screen.findAllByRole('button', { name: /기간을 넘는 팀 회의/ }))[1])
    expect(screen.queryAllByRole('button', { name: '예약 취소' })).toHaveLength(1)
  })

  it('confirms room reservation cancellation once, refreshes related queries, and restores focus', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    let resolveCancellation: (() => void) | undefined
    const cancelRoomReservation = vi.fn(
      () => new Promise<void>((resolve) => (resolveCancellation = resolve)),
    )
    const ownedRoomReservation = {
      ...roomManagedDetail,
      roomReservationId: 17,
      canCancelRoomReservation: true,
    }
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...roomManagedDetail }]),
      getScheduleDetail: () => Promise.resolve(ownedRoomReservation),
      cancelRoomReservation,
    })

    const chip = await screen.findByRole('button', { name: /기간을 넘는 팀 회의/ })
    await user.click(chip)
    await user.click(await screen.findByRole('button', { name: '예약 취소' }))
    expect(
      screen.getByRole('alertdialog', { name: '기간을 넘는 팀 회의 예약 취소' }),
    ).toHaveTextContent('예약과 연결된 일정이 함께 취소되어')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예약 취소' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: '예약 취소' }))
    await user.click(screen.getByRole('button', { name: '계속 예약 보기' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '예약 취소' })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: '예약 취소' }))
    const confirm = screen.getByRole('button', { name: '예약 취소 확정' })
    await user.click(confirm)
    await user.click(confirm)
    expect(cancelRoomReservation).toHaveBeenCalledTimes(1)
    expect(cancelRoomReservation).toHaveBeenCalledWith(17)
    expect(confirm).toBeDisabled()
    resolveCancellation?.()
    expect(await screen.findByText('회의실 예약과 연결 일정이 취소되었습니다.')).toBeVisible()
    expect(screen.queryByRole('dialog', { name: '기간을 넘는 팀 회의' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2024년 2월 29일 일정 보기' })).toHaveFocus()
  })

  it.each([
    [401, '로그인이 만료되었습니다. 다시 로그인해 주세요.'],
    [403, '이 예약을 취소할 권한이 없습니다.'],
    [404, '예약을 찾을 수 없습니다. 목록을 새로고침해 주세요.'],
    [409, '예약 취소 중 충돌이 발생했습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.'],
    [undefined, '네트워크 오류가 발생했습니다. 기존 일정은 유지됩니다. 다시 시도해 주세요.'],
  ])(
    'keeps a room-managed detail visible and explains reservation cancellation error %s',
    async (status, message) => {
      window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
      const user = userEvent.setup()
      const ownedRoomReservation = {
        ...roomManagedDetail,
        roomReservationId: 17,
        canCancelRoomReservation: true,
      }
      renderCalendar({
        getSchedules: () => Promise.resolve([{ ...roomManagedDetail }]),
        getScheduleDetail: () => Promise.resolve(ownedRoomReservation),
        cancelRoomReservation: () =>
          Promise.reject(
            status === undefined
              ? new Error('offline')
              : Object.assign(new Error('request failed'), { status }),
          ),
      })
      await user.click(await screen.findByRole('button', { name: /기간을 넘는 팀 회의/ }))
      await user.click(await screen.findByRole('button', { name: '예약 취소' }))
      await user.click(screen.getByRole('button', { name: '예약 취소 확정' }))
      expect(await screen.findByText(message)).toBeVisible()
      expect(screen.getByRole('heading', { name: '기간을 넘는 팀 회의' })).toBeVisible()
    },
  )

  it.each([
    [403, '이 일정을 취소할 권한이 없습니다.'],
    [404, '일정을 찾을 수 없습니다. 목록을 새로고침해 주세요.'],
    [409, '회의실 예약 관리 일정입니다. 회의실 예약 취소 흐름을 사용해 주세요.'],
    [undefined, '네트워크 오류가 발생했습니다. 기존 일정은 유지됩니다. 다시 시도해 주세요.'],
  ])('keeps detail data visible and explains cancellation error %s', async (status, message) => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    const cancelSchedule = vi.fn(() =>
      Promise.reject(
        status === undefined
          ? new Error('offline')
          : Object.assign(new Error('request failed'), { status }),
      ),
    )
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...editableDetail }]),
      getScheduleDetail: () => Promise.resolve(editableDetail),
      cancelSchedule,
    })
    await user.click(await screen.findByRole('button', { name: /수정할 개인 일정/ }))
    await user.click(await screen.findByRole('button', { name: '일정 취소' }))
    await user.click(screen.getByRole('button', { name: '일정 취소 확정' }))
    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByRole('heading', { name: '수정할 개인 일정' })).toBeVisible()
  })
  it('defaults to the monthly URL view, calculates leap-month range, and switches views', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-15')
    const getSchedules = vi.fn(() => Promise.resolve(schedules))
    const user = userEvent.setup()
    renderCalendar({ getSchedules })

    expect(await screen.findByRole('heading', { name: '2024년 2월' })).toBeVisible()
    expect(screen.queryByText('CALENDAR')).not.toBeInTheDocument()
    expect(
      (await screen.findAllByRole('columnheader')).map((header) => header.textContent),
    ).toEqual(['일', '월', '화', '수', '목', '금', '토'])
    expect(screen.getAllByRole('gridcell')).toHaveLength(35)
    expect(
      screen.queryByRole('button', { name: '2024년 1월 28일 일정 보기' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2024년 2월 1일 일정 보기' })).toBeVisible()
    expect(getSchedules).toHaveBeenCalledWith(
      { from: '2024-02-01T00:00:00+09:00', to: '2024-03-01T00:00:00+09:00' },
      expect.any(AbortSignal),
    )
    expect(await screen.findByRole('button', { name: /종일 개인 일정/ })).toHaveTextContent(
      '종일 개인 일정 · 개인',
    )

    await user.click(screen.getByRole('button', { name: '주간 보기' }))
    expect(window.location.search).toContain('view=week')
    expect(await screen.findByRole('heading', { name: '2024년 2월 11일 주' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '일간 보기' }))
    expect(window.location.search).toContain('view=day')
    expect(await screen.findByRole('heading', { name: '2024년 2월 15일' })).toBeVisible()
  })

  it.each([
    [
      'month',
      '2024-02-15',
      '2024년 2월',
      '2024년 12월',
      { from: '2024-12-01T00:00:00+09:00', to: '2025-01-01T00:00:00+09:00' },
    ],
    [
      'week',
      '2024-02-11',
      '2024년 2월 11일 주',
      '2024년 12월 29일 주',
      { from: '2024-12-29T00:00:00+09:00', to: '2025-01-05T00:00:00+09:00' },
    ],
    [
      'day',
      '2024-02-15',
      '2024년 2월 15일',
      '2024년 12월 31일',
      { from: '2024-12-31T00:00:00+09:00', to: '2025-01-01T00:00:00+09:00' },
    ],
  ] as const)(
    'keeps the %s view and updates its date URL to the injected local today date',
    async (view, initialDate, initialHeading, expectedHeading, expectedPeriod) => {
      window.history.replaceState({}, '', `/?view=${view}&date=${initialDate}`)
      const user = userEvent.setup()
      const now = vi.fn(() => new Date('2024-12-31T12:00:00+09:00'))
      const getSchedules = vi.fn(() => Promise.resolve(schedules))
      renderCalendar({ getSchedules, now })

      await screen.findByRole('heading', { name: initialHeading })
      await user.click(screen.getByRole('button', { name: '오늘' }))

      expect(now).toHaveBeenCalled()
      expect(window.location.search).toBe(`?view=${view}&date=2024-12-31`)
      expect(await screen.findByRole('heading', { name: expectedHeading })).toBeVisible()
      await waitFor(() =>
        expect(getSchedules).toHaveBeenLastCalledWith(expectedPeriod, expect.any(AbortSignal)),
      )
    },
  )

  it('groups header actions semantically and keeps schedule creation last in keyboard order', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-15')
    renderCalendar({ onCreateSchedule: vi.fn() })

    const headerActions = await screen.findByTestId('calendar-header-actions')
    const periodControls = within(headerActions).getByRole('group', { name: '기간 이동' })
    const viewControls = within(headerActions).getByRole('group', { name: '보기 선택' })
    expect(within(periodControls).getByRole('button', { name: '이전' })).toBeVisible()
    expect(within(periodControls).getByRole('button', { name: '오늘' })).toBeVisible()
    expect(within(periodControls).getByRole('button', { name: '다음' })).toBeVisible()
    expect(within(viewControls).getByRole('button', { name: '월간 보기' })).toBeVisible()
    expect(within(viewControls).getByRole('button', { name: '주간 보기' })).toBeVisible()
    expect(within(viewControls).getByRole('button', { name: '일간 보기' })).toBeVisible()
    expect(within(headerActions).getByRole('button', { name: '일정 추가' }).parentElement).toBe(
      headerActions,
    )
    expect(
      Array.from(headerActions.querySelectorAll('button')).map((button) => button.textContent),
    ).toEqual(['이전', '오늘', '다음', '월간 보기', '주간 보기', '일간 보기', '일정 추가'])
  })

  it('uses neutral, selected, and primary-filled styles to distinguish header action purposes', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-15')
    renderCalendar({ onCreateSchedule: vi.fn() })

    const periodControls = await screen.findByRole('group', { name: '기간 이동' })
    const viewControls = screen.getByRole('group', { name: '보기 선택' })
    const previous = within(periodControls).getByRole('button', { name: '이전' })
    const selectedView = within(viewControls).getByRole('button', { name: '월간 보기' })
    const create = screen.getByRole('button', { name: '일정 추가' })
    expect(previous).toHaveClass('border-border', 'bg-surface')
    expect(previous).not.toHaveClass('bg-primary')
    expect(selectedView).toHaveClass('border-primary', 'bg-secondary')
    expect(selectedView).not.toHaveClass('bg-primary')
    expect(create).toHaveClass('bg-primary', 'text-white')
  })

  it('closes detail only from its backdrop and restores focus to its original schedule trigger', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar()
    const chip = await screen.findByRole('button', { name: /기간을 넘는 팀 회의/ })

    await user.click(chip)
    const modal = await screen.findByRole('dialog', { name: '기간을 넘는 팀 회의' })
    await user.click(screen.getByText('회의실 예약에서 관리하는 일정입니다.'))
    expect(modal).toBeVisible()

    await user.click(screen.getByTestId('schedule-detail-backdrop'))
    expect(screen.queryByRole('dialog', { name: '기간을 넘는 팀 회의' })).not.toBeInTheDocument()
    expect(chip).toHaveFocus()
  })

  it('opens the date timeline panel and room-managed detail modal, then restores focus', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar()

    const dayButton = await screen.findByRole('button', { name: '2024년 2월 29일 일정 보기' })
    await user.click(dayButton)
    expect(screen.getByRole('dialog', { name: '2024년 2월 29일 일정' })).toBeVisible()

    const panel = screen.getByRole('dialog', { name: '2024년 2월 29일 일정' })
    expect(within(panel).getByTestId('calendar-day-timeline')).toBeVisible()
    expect(within(panel).getByTestId('calendar-day-timed-2')).toHaveStyle({
      top: '1380px',
      height: '60px',
    })
    const scheduleButton = within(panel).getByRole('button', { name: /기간을 넘는 팀 회의/ })
    await user.click(scheduleButton)
    expect(await screen.findByRole('dialog', { name: '기간을 넘는 팀 회의' })).toBeVisible()
    expect(screen.getByText('회의실 예약에서 관리하는 일정입니다.')).toBeVisible()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '기간을 넘는 팀 회의' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '2024년 2월 29일 일정' })).toBeVisible()
    expect(scheduleButton).toHaveFocus()
  })

  it('includes a timed schedule that starts and ends on the selected date in its timeline panel', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar({ getSchedules: () => Promise.resolve([{ ...editableDetail }]) })

    await user.click(await screen.findByRole('button', { name: '2024년 2월 29일 일정 보기' }))

    const panel = screen.getByRole('dialog', { name: '2024년 2월 29일 일정' })
    expect(within(panel).getByTestId('calendar-day-timed-3')).toHaveStyle({
      top: '540px',
      height: '60px',
    })
  })

  it('closes the date timeline panel only from its backdrop and restores date-button focus', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar()

    const dayButton = await screen.findByRole('button', { name: '2024년 2월 29일 일정 보기' })
    await user.click(dayButton)
    const panel = screen.getByRole('dialog', { name: '2024년 2월 29일 일정' })
    await user.click(within(panel).getByText('하루 종일'))
    expect(panel).toBeVisible()

    await user.click(screen.getByTestId('calendar-date-panel-backdrop'))
    expect(screen.queryByRole('dialog', { name: '2024년 2월 29일 일정' })).not.toBeInTheDocument()
    expect(dayButton).toHaveFocus()
  })

  it('renders the schedule-create action in the calendar header', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-15')
    const onCreateSchedule = vi.fn()
    const user = userEvent.setup()
    renderCalendar({ onCreateSchedule })

    const header = await screen.findByTestId('calendar-header')
    await user.click(within(header).getByRole('button', { name: '일정 추가' }))
    expect(onCreateSchedule).toHaveBeenCalledTimes(1)
  })

  it('keeps error and permission states distinct from empty data and offers retry', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-15')
    const getSchedules = vi
      .fn((_period: { from: string; to: string }, _signal?: AbortSignal) => Promise.resolve([]))
      .mockRejectedValueOnce(Object.assign(new Error('forbidden'), { status: 403 }))
      .mockResolvedValueOnce([])
    const user = userEvent.setup()
    renderCalendar({ getSchedules })

    expect(await screen.findByText('일정을 볼 권한이 없습니다.')).toBeVisible()
    expect(screen.queryByText('이 기간에는 일정이 없습니다.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('이 기간에는 일정이 없습니다.')).toBeVisible()
  })

  it('uses a mobile overlay with textual alternatives and no horizontal overflow', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    Object.defineProperty(document.documentElement, 'scrollWidth', {
      configurable: true,
      value: 390,
    })
    const user = userEvent.setup()
    renderCalendar()

    await user.click(await screen.findByRole('button', { name: '2024년 2월 29일 일정 보기' }))
    expect(screen.getByRole('dialog', { name: '2024년 2월 29일 일정' })).toBeVisible()
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  })

  it('renders every calendar color as a distinct background without exposing raw enum names', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const coloredSchedules = (['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'] as const).map(
      (colorLabel, index) => ({
        ...editableDetail,
        id: index + 10,
        title: `${index + 1}번 일정`,
        colorLabel,
      }),
    )
    renderCalendar({ getSchedules: () => Promise.resolve(coloredSchedules) })

    const expectedBackgrounds = [
      'bg-red-100',
      'bg-orange-100',
      'bg-yellow-100',
      'bg-green-100',
      'bg-blue-100',
      'bg-violet-100',
    ]
    for (const [index, background] of expectedBackgrounds.entries()) {
      expect(await screen.findByTestId(`calendar-schedule-chip-${index + 10}`)).toHaveClass(
        background,
      )
    }
    expect(screen.queryByText(/^(RED|ORANGE|YELLOW|GREEN|BLUE|PURPLE)$/)).not.toBeInTheDocument()
  })

  it('places day-view schedules on a 24-hour vertical timeline and keeps all-day schedules separate', async () => {
    window.history.replaceState({}, '', '/?view=day&date=2024-02-29')
    renderCalendar({ getSchedules: () => Promise.resolve([{ ...editableDetail }, schedules[0]]) })

    expect(await screen.findByTestId('calendar-day-timeline')).toBeVisible()
    expect(screen.getByText('00:00')).toBeVisible()
    expect(screen.getByText('23:00')).toBeVisible()
    expect(screen.getByTestId('calendar-day-all-day')).toHaveTextContent('종일 개인 일정')
    expect(screen.getByTestId('calendar-day-timed-3')).toHaveStyle({ top: '540px', height: '60px' })
  })

  it('keeps day timeline labels accessible and opens a timed schedule from the keyboard', async () => {
    window.history.replaceState({}, '', '/?view=day&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...editableDetail }, schedules[0]]),
      getScheduleDetail: () => Promise.resolve(editableDetail),
    })

    const allDayRegion = await screen.findByTestId('calendar-day-all-day')
    const timedSchedule = screen.getByTestId('calendar-day-timed-3')
    expect(within(allDayRegion).getByRole('button', { name: /종일 개인 일정/ })).toBeVisible()
    expect(within(allDayRegion).queryByRole('button', { name: /수정할 개인 일정/ })).toBeNull()
    expect(screen.getByTestId('calendar-day-time-labels')).toHaveTextContent('00:00')
    expect(screen.getByTestId('calendar-day-time-labels')).toHaveTextContent('23:00')
    expect(screen.getByTestId('calendar-day-time-labels')).toHaveTextContent('24:00')
    expect(timedSchedule).toHaveAccessibleName(
      '수정할 개인 일정 · 개인 · 2024년 2월 29일 09:00–10:00',
    )

    timedSchedule.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog', { name: '수정할 개인 일정' })).toBeVisible()
  })

  it('keeps calendar modal close controls in the top-right and footer actions business-only', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...editableDetail }]),
      getScheduleDetail: () => Promise.resolve(editableDetail),
    })

    await user.click(await screen.findByRole('button', { name: /수정할 개인 일정/ }))
    const detail = await screen.findByRole('dialog', { name: '수정할 개인 일정' })
    expect(within(detail).getByRole('button', { name: '닫기' })).toHaveClass(
      'absolute',
      'top-4',
      'right-4',
    )
    expect(within(detail).queryByRole('button', { name: '닫기' })).toBeInTheDocument()
    await user.click(within(detail).getByRole('button', { name: '일정 수정' }))

    const edit = screen.getByRole('dialog', { name: '일정 수정' })
    expect(within(edit).getByRole('button', { name: '닫기' })).toHaveClass(
      'absolute',
      'top-4',
      'right-4',
    )
    expect(within(edit).queryByRole('button', { name: '수정 취소' })).not.toBeInTheDocument()
    expect(within(edit).getByRole('button', { name: '수정 저장' })).toBeVisible()
  })

  it('styles edit and cancellation confirmation actions by intent in responsive modal footers', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...editableDetail }]),
      getScheduleDetail: () => Promise.resolve(editableDetail),
    })

    await user.click(await screen.findByRole('button', { name: /수정할 개인 일정/ }))
    await user.click(screen.getByRole('button', { name: '일정 수정' }))
    const title = screen.getByLabelText('제목')
    await user.type(title, ' 변경')
    await user.click(screen.getByRole('button', { name: '닫기' }))

    const discard = screen.getByRole('alertdialog', { name: '수정 내용을 버릴까요?' })
    const discardClose = within(discard).getByRole('button', { name: '닫기' })
    const continueEditing = within(discard).getByRole('button', { name: '계속 수정' })
    const discardChanges = within(discard).getByRole('button', { name: '수정 취소하고 닫기' })
    expect(screen.getByTestId('confirmation-dialog-overlay')).toHaveClass(
      'fixed',
      'inset-0',
      'grid',
      'place-items-center',
    )
    expect(discard).toHaveClass('relative', 'w-full', 'max-w-sm')
    expect(discard).not.toHaveClass('inset-1/2')
    expect(discardClose).toHaveClass('absolute', 'top-4', 'right-4', 'focus-visible:outline-3')
    expect(discardClose).toHaveFocus()
    expect(continueEditing).toHaveClass('border-border', 'bg-surface', 'sm:w-auto')
    expect(discardChanges).toHaveClass('border-red-700', 'bg-red-700', 'sm:w-auto')
    expect(continueEditing.parentElement).toHaveClass('sm:justify-end', 'flex-col')
    await user.keyboard('{Tab}')
    expect(continueEditing).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: '일정 수정' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '닫기' }))
    await user.click(screen.getByRole('button', { name: '수정 취소하고 닫기' }))
    await user.click(screen.getByRole('button', { name: '일정 취소' }))

    const cancellation = screen.getByRole('alertdialog', { name: '수정할 개인 일정 취소' })
    const keepViewing = within(cancellation).getByRole('button', { name: '계속 일정 보기' })
    const confirmCancellation = within(cancellation).getByRole('button', { name: '일정 취소 확정' })
    const cancelClose = within(cancellation).getByRole('button', { name: '닫기' })
    expect(cancelClose).toHaveClass('absolute', 'top-4', 'right-4', 'focus-visible:outline-3')
    expect(cancelClose).toHaveFocus()
    expect(keepViewing).toHaveClass('border-border', 'bg-surface', 'sm:w-auto')
    expect(confirmCancellation).toHaveClass('border-red-700', 'bg-red-700', 'sm:w-auto')
    expect(keepViewing.parentElement).toHaveClass('sm:justify-end', 'flex-col')
    await user.keyboard('{Tab}')
    expect(keepViewing).toHaveFocus()
    await user.click(keepViewing)
    expect(screen.getByRole('dialog', { name: '수정할 개인 일정' })).toBeVisible()
  })

  it('prevents duplicate save and cancellation requests while their modal actions are pending', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    let resolveUpdate: ((detail: ScheduleDetail) => void) | undefined
    let resolveCancellation: (() => void) | undefined
    const updateSchedule = vi.fn(
      () => new Promise<ScheduleDetail>((resolve) => (resolveUpdate = resolve)),
    )
    const cancelSchedule = vi.fn(
      () => new Promise<void>((resolve) => (resolveCancellation = resolve)),
    )
    const user = userEvent.setup()
    renderCalendar({
      getSchedules: () => Promise.resolve([{ ...editableDetail }]),
      getScheduleDetail: () => Promise.resolve(editableDetail),
      updateSchedule,
      cancelSchedule,
    })

    await user.click(await screen.findByRole('button', { name: /수정할 개인 일정/ }))
    await user.click(screen.getByRole('button', { name: '일정 수정' }))
    const save = screen.getByRole('button', { name: '수정 저장' })
    await user.click(save)
    expect(save).toBeDisabled()
    expect(save).toHaveClass('disabled:opacity-70')
    await user.click(save)
    expect(updateSchedule).toHaveBeenCalledTimes(1)
    resolveUpdate?.(editableDetail)
    await screen.findByRole('dialog', { name: '수정할 개인 일정' })

    await user.click(screen.getByRole('button', { name: '일정 취소' }))
    const confirm = screen.getByRole('button', { name: '일정 취소 확정' })
    await user.click(confirm)
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveClass('disabled:opacity-70')
    await user.click(confirm)
    expect(cancelSchedule).toHaveBeenCalledTimes(1)
    resolveCancellation?.()
    expect(await screen.findByText('일정이 취소되었습니다.')).toBeVisible()
  })
})
