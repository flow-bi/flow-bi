import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  ScheduleApiError,
  type CreateScheduleRequest,
  type ScheduleTargetOptions,
} from './scheduleCreateApi'
import { ScheduleCreateModal } from './ScheduleCreateModal'

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function ModalHarness() {
    const [isOpen, setIsOpen] = useState(false)
    return (
      <QueryClientProvider client={queryClient}>
        <button onClick={() => setIsOpen(true)} type="button">
          일정 추가
        </button>
        {isOpen && (
          <ScheduleCreateModal
            onClose={() => {
              onClose()
              setIsOpen(false)
            }}
            searchAttendees={() => Promise.resolve([])}
          />
        )}
      </QueryClientProvider>
    )
  }
  const view = render(<ModalHarness />)
  return { ...view, onClose, queryClient }
}

describe('ScheduleCreateModal', () => {
  it('does not expose attendee or user-sharing controls for a personal schedule and submits empty relations', async () => {
    const user = userEvent.setup()
    const createSchedule = vi.fn<(request: CreateScheduleRequest) => Promise<void>>(() =>
      Promise.resolve(),
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          createSchedule={createSchedule}
          onClose={vi.fn()}
          searchAttendees={() =>
            Promise.resolve([{ userId: 99, displayName: '노출되면 안 되는 사용자' }])
          }
        />
      </QueryClientProvider>,
    )

    expect(screen.queryByLabelText('참석자 검색')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('공유 사용자 ID')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('제목'), '개인 일정')
    await user.type(screen.getByLabelText('날짜'), '2026-08-10')
    await user.click(screen.getByRole('button', { name: '일정 저장' }))

    await waitFor(() => expect(createSchedule).toHaveBeenCalledTimes(1))
    expect(createSchedule.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ participantIds: [], userTargetIds: [] }),
    )
  })

  it('selects accessible team names and submits their IDs without exposing raw ID inputs', async () => {
    const user = userEvent.setup()
    const createSchedule = vi.fn<(request: CreateScheduleRequest) => Promise<void>>(() =>
      Promise.resolve(),
    )
    const targetOptions = vi.fn<() => Promise<ScheduleTargetOptions>>(() =>
      Promise.resolve({
        teams: [
          { id: 10, name: '플랫폼 팀' },
          { id: 12, name: '디자인 팀' },
        ],
        projects: [{ id: 20, name: '캘린더 개선' }],
      }),
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          createSchedule={createSchedule}
          getTargetOptions={targetOptions}
          onClose={vi.fn()}
          searchAttendees={() => Promise.resolve([])}
        />
      </QueryClientProvider>,
    )

    await user.selectOptions(screen.getByLabelText('일정 유형'), 'TEAM')
    const targets = await screen.findByRole('group', { name: '팀 대상' })
    await user.click(within(targets).getByLabelText('플랫폼 팀'))
    await user.click(within(targets).getByLabelText('디자인 팀'))
    expect(screen.queryByLabelText(['팀 대상', 'ID'].join(' '))).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('제목'), '스프린트 계획')
    await user.type(screen.getByLabelText('날짜'), '2026-08-10')
    await user.click(screen.getByRole('button', { name: '일정 저장' }))

    await waitFor(() => expect(createSchedule).toHaveBeenCalledTimes(1))
    expect(createSchedule.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ teamTargetIds: [10, 12], projectTargetIds: [] }),
    )
  })

  it('shows target option loading, empty, error and retry states without treating failures as empty', async () => {
    const user = userEvent.setup()
    const getTargetOptions = vi
      .fn<() => Promise<ScheduleTargetOptions>>()
      .mockRejectedValueOnce(new ScheduleApiError('unauthorized', 401))
      .mockResolvedValueOnce({ teams: [], projects: [] })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          getTargetOptions={getTargetOptions}
          onClose={vi.fn()}
          searchAttendees={() => Promise.resolve([])}
        />
      </QueryClientProvider>,
    )

    await user.selectOptions(screen.getByLabelText('일정 유형'), 'TEAM')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '일정 대상 목록을 불러오지 못했습니다.',
    )
    expect(screen.queryByText('선택 가능한 팀이 없습니다.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '대상 목록 다시 시도' }))
    expect(await screen.findByText('선택 가능한 팀이 없습니다.')).toBeVisible()
  })

  it('announces target option loading until the available names arrive', async () => {
    const user = userEvent.setup()
    let resolveTargetOptions: ((options: ScheduleTargetOptions) => void) | undefined
    const targetOptions = new Promise<ScheduleTargetOptions>((resolve) => {
      resolveTargetOptions = resolve
    })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          getTargetOptions={() => targetOptions}
          onClose={vi.fn()}
          searchAttendees={() => Promise.resolve([])}
        />
      </QueryClientProvider>,
    )

    await user.selectOptions(screen.getByLabelText('일정 유형'), 'TEAM')
    expect(await screen.findByText('일정 대상 목록을 불러오고 있습니다.')).toBeVisible()
    resolveTargetOptions?.({ teams: [{ id: 10, name: '플랫폼 팀' }], projects: [] })
    expect(await screen.findByLabelText('플랫폼 팀')).toBeVisible()
  })

  it('keeps 403 target option failures visible instead of treating them as empty', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          getTargetOptions={() => Promise.reject(new ScheduleApiError('forbidden', 403))}
          onClose={vi.fn()}
          searchAttendees={() => Promise.resolve([])}
        />
      </QueryClientProvider>,
    )

    await user.selectOptions(screen.getByLabelText('일정 유형'), 'PROJECT')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '일정 대상 목록을 불러오지 못했습니다.',
    )
    expect(screen.queryByText('선택 가능한 프로젝트가 없습니다.')).not.toBeInTheDocument()
  })

  it('clears the other target type when changing schedule type and connects required errors', async () => {
    const user = userEvent.setup()
    const createSchedule = vi.fn<(request: CreateScheduleRequest) => Promise<void>>(() =>
      Promise.resolve(),
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          createSchedule={createSchedule}
          getTargetOptions={() =>
            Promise.resolve({
              teams: [{ id: 10, name: '플랫폼 팀' }],
              projects: [{ id: 20, name: '캘린더 개선' }],
            })
          }
          onClose={vi.fn()}
          searchAttendees={() => Promise.resolve([])}
        />
      </QueryClientProvider>,
    )

    await user.selectOptions(screen.getByLabelText('일정 유형'), 'TEAM')
    await user.click(await screen.findByLabelText('플랫폼 팀'))
    await user.selectOptions(screen.getByLabelText('일정 유형'), 'PROJECT')
    await user.type(screen.getByLabelText('제목'), '프로젝트 계획')
    await user.type(screen.getByLabelText('날짜'), '2026-08-10')
    await user.click(screen.getByRole('button', { name: '일정 저장' }))
    const error = await screen.findByText('프로젝트 대상을 하나 이상 선택해 주세요.')
    expect(error).toHaveAttribute('id', 'schedule-project-targets-error')
    expect(screen.getByRole('group', { name: '프로젝트 대상' })).toHaveAttribute(
      'aria-describedby',
      'schedule-project-targets-error',
    )

    await user.click(screen.getByLabelText('캘린더 개선'))
    await user.click(screen.getByRole('button', { name: '일정 저장' }))
    await waitFor(() => expect(createSchedule).toHaveBeenCalledTimes(1))
    expect(createSchedule.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ teamTargetIds: [], projectTargetIds: [20] }),
    )
  })

  it('uses stable hooks for its responsive Tailwind modal surfaces', () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal onClose={vi.fn()} searchAttendees={() => Promise.resolve([])} />
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('schedule-create-backdrop')).toHaveClass('fixed', 'inset-0')
    expect(screen.getByTestId('schedule-create-panel')).toHaveClass('w-full', 'max-w-2xl')
    expect(screen.getByTestId('schedule-create-form-grid')).toHaveClass('grid', 'sm:grid-cols-3')
    expect(screen.getByTestId('schedule-all-day-field')).toHaveClass(
      'flex',
      'items-center',
      'gap-2',
    )
    expect(screen.getByTestId('schedule-creator-attends-field')).toHaveClass(
      'flex',
      'items-center',
      'gap-2',
    )
  })

  it('opens with the title focused, validates required fields, and restores focus after Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.click(screen.getByRole('button', { name: '일정 추가' }))
    const title = screen.getByLabelText('제목')

    expect(title).toHaveFocus()
    await user.click(screen.getByRole('button', { name: '일정 저장' }))
    expect(await screen.findByText('제목을 입력해 주세요.')).toBeVisible()
    expect(title).toHaveAttribute('aria-describedby', 'schedule-title-error')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: '일정 추가' })).toHaveFocus()
  })

  it('closes from an empty backdrop click, keeps modal-content clicks open, and restores trigger focus', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    const trigger = screen.getByRole('button', { name: '일정 추가' })

    await user.click(trigger)
    await user.click(screen.getByLabelText('제목'))
    expect(screen.getByRole('dialog', { name: '일정 추가' })).toBeVisible()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByTestId('schedule-create-backdrop'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(trigger).toHaveFocus()
  })

  it('confirms dirty backdrop dismissal and preserves draft while a save is pending', async () => {
    const user = userEvent.setup()
    const createSchedule = vi.fn(() => new Promise<void>(() => {}))
    const onClose = vi.fn()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          createSchedule={createSchedule}
          onClose={onClose}
          searchAttendees={() => Promise.resolve([])}
        />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('제목'), '저장 중인 일정')
    await user.click(screen.getByTestId('schedule-create-backdrop'))
    expect(screen.getByRole('alertdialog', { name: '입력한 내용을 버릴까요?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '계속 입력' }))
    await user.type(screen.getByLabelText('날짜'), '2026-08-10')
    await user.click(screen.getByRole('button', { name: '일정 저장' }))
    expect(createSchedule).toHaveBeenCalledTimes(1)

    await user.click(screen.getByTestId('schedule-create-backdrop'))
    expect(screen.getByRole('dialog', { name: '일정 추가' })).toBeVisible()
    expect(screen.getByLabelText('제목')).toHaveValue('저장 중인 일정')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders the discard confirmation in the shared card with secondary and danger actions', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal onClose={vi.fn()} searchAttendees={() => Promise.resolve([])} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('제목'), '임시 일정')
    await user.click(screen.getByTestId('schedule-create-backdrop'))

    const dialog = screen.getByRole('alertdialog', { name: '입력한 내용을 버릴까요?' })
    const card = screen.getByTestId('confirmation-dialog-card')
    expect(card).toBe(dialog)
    expect(within(card).getByText('저장하지 않은 입력은 사라집니다.')).toBeVisible()
    expect(within(card).getByRole('button', { name: '닫기' })).toBeVisible()
    expect(within(card).getByRole('button', { name: '계속 입력' })).toHaveClass(
      'border',
      'sm:w-auto',
    )
    expect(within(card).getByRole('button', { name: '입력 취소하고 닫기' })).toHaveClass(
      'border-red-700',
      'sm:w-auto',
    )
    expect(screen.getByTestId('confirmation-dialog-footer')).toHaveClass(
      'flex-col',
      'sm:flex-row',
      'sm:justify-end',
    )
  })

  it('connects the required date error to its input', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal onClose={vi.fn()} searchAttendees={() => Promise.resolve([])} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: '일정 저장' }))

    expect(await screen.findByText('날짜를 선택해 주세요.')).toHaveAttribute(
      'id',
      'schedule-date-error',
    )
    expect(screen.getByLabelText('날짜')).toHaveAttribute('aria-describedby', 'schedule-date-error')
  })

  it('changes visibility defaults, deduplicates attendees, includes creator when selected, and prevents duplicate submission', async () => {
    const user = userEvent.setup()
    const createSchedule = vi.fn(() => new Promise<void>(() => {}))
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          createSchedule={createSchedule}
          getTargetOptions={() =>
            Promise.resolve({ teams: [{ id: 10, name: '플랫폼 팀' }], projects: [] })
          }
          onClose={vi.fn()}
          searchAttendees={() => Promise.resolve([{ userId: 2, displayName: '민지' }])}
        />
      </QueryClientProvider>,
    )

    await user.selectOptions(screen.getByLabelText('일정 유형'), 'TEAM')
    expect(screen.getByLabelText('공개 범위')).toHaveValue('TEAM')
    await user.type(screen.getByLabelText('제목'), '스프린트 계획')
    await user.type(screen.getByLabelText('날짜'), '2026-08-10')
    await user.click(await screen.findByLabelText('플랫폼 팀'))
    await user.type(screen.getByLabelText('참석자 검색'), '민지')
    await user.click(await screen.findByRole('button', { name: '민지 참석자로 추가' }))
    await user.type(screen.getByLabelText('참석자 검색'), '민지')
    await user.click(await screen.findByRole('button', { name: '민지 참석자로 추가' }))
    expect(await screen.findByText('이미 선택된 참석자입니다.')).toBeVisible()
    await user.click(screen.getByLabelText('등록자도 참석'))
    expect(screen.getByText('자동 참석 인원: 2명')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '일정 저장' }))
    await user.click(screen.getByRole('button', { name: '일정 저장 중' }))
    expect(createSchedule).toHaveBeenCalledTimes(1)
  })

  it('confirms discarding dirty input and sends all-day schedules as a complete [start, end) day', async () => {
    const user = userEvent.setup()
    const createSchedule = vi.fn<(request: CreateScheduleRequest) => Promise<void>>(() =>
      Promise.resolve(),
    )
    const onClose = vi.fn()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          createSchedule={createSchedule}
          onClose={onClose}
          searchAttendees={() => Promise.resolve([])}
        />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('제목'), 'vacation')
    expect(screen.getByLabelText('제목')).toHaveValue('vacation')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog', { name: '입력한 내용을 버릴까요?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: '계속 입력' }))

    await user.type(screen.getByLabelText('날짜'), '2026-08-10')
    await user.click(screen.getByLabelText('하루종일'))
    await user.click(screen.getByRole('button', { name: '일정 저장' }))

    expect(createSchedule.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        startAt: '2026-08-10T00:00:00+09:00',
        endAt: '2026-08-11T00:00:00+09:00',
        allDay: true,
      }),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps attendee-search permission failures visible instead of treating them as an empty result', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ScheduleCreateModal
          onClose={vi.fn()}
          searchAttendees={() => Promise.reject(new ScheduleApiError('forbidden', 403))}
        />
      </QueryClientProvider>,
    )

    await user.selectOptions(screen.getByLabelText('일정 유형'), 'TEAM')
    await user.type(screen.getByLabelText('참석자 검색'), '민지')

    expect(await screen.findByText('참석자 검색 권한이 없습니다.')).toBeVisible()
    expect(screen.queryByText('일치하는 참석자가 없습니다.')).not.toBeInTheDocument()
  })

  it('removes attendee candidates from the query cache when the modal closes', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderModal()

    await user.click(screen.getByRole('button', { name: '일정 추가' }))
    await user.selectOptions(screen.getByLabelText('일정 유형'), 'TEAM')
    await user.type(screen.getByLabelText('참석자 검색'), '민지')
    await screen.findByText('일치하는 참석자가 없습니다.')
    expect(queryClient.getQueryData(['schedule', 'attendee-candidates', '민지'])).toEqual([])

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: '입력 취소하고 닫기' }))

    expect(queryClient.getQueryData(['schedule', 'attendee-candidates', '민지'])).toBeUndefined()
  })
})
