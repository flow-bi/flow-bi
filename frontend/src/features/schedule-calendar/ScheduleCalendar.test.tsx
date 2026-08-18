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
        participantIds: [2, 3],
        userTargetIds: [8],
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
})
