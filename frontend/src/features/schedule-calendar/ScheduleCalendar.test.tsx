import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ScheduleCalendar } from './ScheduleCalendar'

import type { ScheduleDetail, ScheduleSummary } from './scheduleCalendarApi'

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
  userTargetIds: [],
  teamTargetIds: [10],
  projectTargetIds: [],
  meetingRoomManaged: true,
  canManage: false,
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
    expect(screen.getByTestId('calendar-schedule-chip-1')).toHaveClass('border-l-blue-600')
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

    await user.click(await screen.findByRole('button', { name: /수정할 개인 일정/ }))
    await user.click(await screen.findByRole('button', { name: '일정 수정' }))
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
        participantIds: [2, 3],
        userTargetIds: [8],
        teamTargetIds: [],
        projectTargetIds: [],
      }),
    )
    expect(await screen.findByRole('dialog', { name: '변경된 일정 상세' })).toBeVisible()
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

    await user.click(await screen.findByRole('button', { name: /수정할 개인 일정/ }))
    await user.click(await screen.findByRole('button', { name: '일정 수정' }))
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
  })

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
    expect(screen.queryByRole('dialog', { name: /상세/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2024년 2월 29일 일정 보기' })).toHaveFocus()
  })

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
    expect(screen.getByText('수정할 개인 일정 상세')).toBeVisible()
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
      '개인 · BLUE · 종일 · 종일 개인 일정',
    )

    await user.click(screen.getByRole('button', { name: '주간 보기' }))
    expect(window.location.search).toContain('view=week')
    expect(await screen.findByRole('heading', { name: '2024년 2월 11일 주' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: '일간 보기' }))
    expect(window.location.search).toContain('view=day')
    expect(await screen.findByRole('heading', { name: '2024년 2월 15일' })).toBeVisible()
  })

  it('closes detail only from its backdrop and restores focus to its original schedule trigger', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar()
    const chip = await screen.findByRole('button', { name: /기간을 넘는 팀 회의/ })

    await user.click(chip)
    const modal = await screen.findByRole('dialog', { name: '기간을 넘는 팀 회의 상세' })
    await user.click(screen.getByText('회의실 예약에서 관리하는 일정입니다.'))
    expect(modal).toBeVisible()

    await user.click(screen.getByTestId('schedule-detail-backdrop'))
    expect(
      screen.queryByRole('dialog', { name: '기간을 넘는 팀 회의 상세' }),
    ).not.toBeInTheDocument()
    expect(chip).toHaveFocus()
  })

  it('opens the desktop date banner and room-managed detail modal, then restores focus', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar()

    const dayButton = await screen.findByRole('button', { name: '2024년 2월 29일 일정 보기' })
    await user.click(dayButton)
    expect(screen.getByRole('complementary', { name: '2024년 2월 29일 일정' })).toBeVisible()

    const banner = screen.getByRole('complementary', { name: '2024년 2월 29일 일정' })
    const scheduleButton = within(banner).getByRole('button', { name: /기간을 넘는 팀 회의/ })
    await user.click(scheduleButton)
    expect(await screen.findByRole('dialog', { name: '기간을 넘는 팀 회의 상세' })).toBeVisible()
    expect(screen.getByText('회의실 예약에서 관리하는 일정입니다.')).toBeVisible()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(scheduleButton).toHaveFocus()
  })

  it('includes a timed schedule that starts and ends on the selected date in its banner', async () => {
    window.history.replaceState({}, '', '/?view=month&date=2024-02-29')
    const user = userEvent.setup()
    renderCalendar({ getSchedules: () => Promise.resolve([{ ...editableDetail }]) })

    await user.click(await screen.findByRole('button', { name: '2024년 2월 29일 일정 보기' }))

    const banner = screen.getByRole('complementary', { name: '2024년 2월 29일 일정' })
    expect(within(banner).getByRole('button', { name: /수정할 개인 일정/ })).toBeVisible()
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
})
