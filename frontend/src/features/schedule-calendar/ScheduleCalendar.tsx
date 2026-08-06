import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
  calendarDays,
  formatCalendarHeading,
  getCalendarPeriod,
  navigateDate,
  type CalendarView,
} from './calendarDate'
import {
  getScheduleDetail as getScheduleDetailRequest,
  getSchedules as getSchedulesRequest,
  cancelSchedule as cancelScheduleRequest,
  updateSchedule as updateScheduleRequest,
  type ScheduleDetail,
  type ScheduleSummary,
  type UpdateScheduleRequest,
} from './scheduleCalendarApi'
import {
  parseIdList,
  scheduleFormSchema,
  scheduleTypeDefaults,
  toScheduleRequest,
  type ScheduleFormValues,
} from '../schedule-create/scheduleForm'

export interface ScheduleCalendarProps {
  getSchedules?: (
    period: { from: string; to: string },
    signal?: AbortSignal,
  ) => Promise<ScheduleSummary[]>
  getScheduleDetail?: (id: number, signal?: AbortSignal) => Promise<ScheduleDetail>
  updateSchedule?: (id: number, request: UpdateScheduleRequest) => Promise<ScheduleDetail>
  cancelSchedule?: (id: number) => Promise<void>
  now?: () => Date
}

function dateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function readState(now: () => Date): { view: CalendarView; date: string } {
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view')
  return {
    view: view === 'week' || view === 'day' ? view : 'month',
    date: /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '')
      ? (params.get('date') as string)
      : dateValue(now()),
  }
}

function scheduleOnDate(schedule: ScheduleSummary, date: string): boolean {
  const [year, month, day] = date.split('-').map(Number)
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
  return (
    schedule.startAt < `${nextDate}T00:00:00+09:00` && schedule.endAt > `${date}T00:00:00+09:00`
  )
}

function typeLabel(type: ScheduleSummary['type']): string {
  return { PERSONAL: '개인', TEAM: '팀', PROJECT: '프로젝트' }[type]
}

function koreanDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}년 ${month}월 ${day}일`
}

function apiErrorText(error: unknown, action: 'update' | 'cancel'): string {
  const status = (error as { status?: number } | undefined)?.status
  if (status === 401) {
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  }
  if (status === 403) {
    return `이 일정을 ${action === 'cancel' ? '취소' : '수정'}할 권한이 없습니다.`
  }
  if (status === 404) {
    return '일정을 찾을 수 없습니다. 목록을 새로고침해 주세요.'
  }
  if (status === 409) {
    return '회의실 예약 관리 일정입니다. 회의실 예약 취소 흐름을 사용해 주세요.'
  }
  return '네트워크 오류가 발생했습니다. 기존 일정은 유지됩니다. 다시 시도해 주세요.'
}

function DetailModal({
  detail,
  canManage,
  onClose,
  onEdit,
  onCancel,
  error,
}: {
  detail: ScheduleDetail
  canManage: boolean
  onClose: () => void
  onEdit: () => void
  onCancel: () => void
  error: string | null
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])
  return (
    <div
      aria-labelledby="schedule-detail-title"
      aria-modal="true"
      className="schedule-detail-backdrop"
      role="dialog"
    >
      <section className="schedule-detail-modal">
        <h2 id="schedule-detail-title">{detail.title} 상세</h2>
        <p>
          {typeLabel(detail.type)} 일정 · {detail.colorLabel} 라벨
        </p>
        <p>{detail.allDay ? '하루종일' : `${detail.startAt} ~ ${detail.endAt}`}</p>
        {detail.location && <p>위치: {detail.location}</p>}
        {detail.content && <p>{detail.content}</p>}
        {detail.meetingRoomManaged && (
          <>
            <p className="schedule-detail-modal__managed">회의실 예약에서 관리하는 일정입니다.</p>
            <p>회의실 예약 취소 흐름을 사용해 주세요.</p>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        {canManage && !detail.meetingRoomManaged && (
          <div className="schedule-detail-modal__actions">
            <button onClick={onEdit} type="button">
              일정 수정
            </button>
            <button onClick={onCancel} type="button">
              일정 취소
            </button>
          </div>
        )}
        <button onClick={onClose} ref={closeRef} type="button">
          닫기
        </button>
      </section>
    </div>
  )
}

function EditModal({
  detail,
  onClose,
  onSave,
  error,
  isSaving,
}: {
  detail: ScheduleDetail
  onClose: () => void
  onSave: (request: UpdateScheduleRequest) => void
  error: string | null
  isSaving: boolean
}) {
  const [confirmClose, setConfirmClose] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const date = detail.startAt.slice(0, 10)
  const startTime = detail.startAt.slice(11, 16)
  const endTime = detail.endAt.slice(11, 16)
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: detail.title,
      date,
      startTime,
      endTime,
      allDay: detail.allDay,
      type: detail.type,
      visibility: detail.visibility,
      colorLabel: detail.colorLabel,
      location: detail.location,
      content: detail.content,
      creatorAttends: detail.creatorAttends,
      participantIds: detail.participantIds,
      userTargetIds: detail.userTargetIds,
      teamTargetIds: detail.teamTargetIds,
      projectTargetIds: detail.projectTargetIds,
    },
  })
  const scheduleType = useWatch({ control: form.control, name: 'type' })
  const allDay = useWatch({ control: form.control, name: 'allDay' })
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  useEffect(() => {
    form.setValue('visibility', scheduleTypeDefaults[scheduleType], { shouldValidate: true })
  }, [form, scheduleType])
  const close = () => {
    if (form.formState.isDirty && !isSaving) {
      setConfirmClose(true)
    } else {
      onClose()
    }
  }
  const submit = (values: ScheduleFormValues) => {
    onSave(toScheduleRequest(values))
  }
  return (
    <div
      aria-labelledby="schedule-edit-title"
      aria-modal="true"
      className="schedule-detail-backdrop"
      role="dialog"
    >
      <section className="schedule-detail-modal">
        <h2 id="schedule-edit-title">일정 수정</h2>
        <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
          <label htmlFor="schedule-edit-title-input">제목</label>
          <input
            aria-describedby={form.formState.errors.title ? 'schedule-edit-title-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.title)}
            autoFocus
            id="schedule-edit-title-input"
            {...form.register('title')}
          />
          {form.formState.errors.title && (
            <p id="schedule-edit-title-error" role="alert">
              {form.formState.errors.title.message}
            </p>
          )}
          <div className="schedule-modal__grid">
            <label>
              날짜
              <input type="date" {...form.register('date')} />
            </label>
            <label>
              시작 시간
              <input disabled={allDay} type="time" {...form.register('startTime')} />
            </label>
            <label>
              종료 시간
              <input disabled={allDay} type="time" {...form.register('endTime')} />
            </label>
          </div>
          {form.formState.errors.endTime && (
            <p role="alert">{form.formState.errors.endTime.message}</p>
          )}
          <label>
            <input type="checkbox" {...form.register('allDay')} /> 하루종일
          </label>
          <label>
            위치
            <input {...form.register('location')} />
          </label>
          <label>
            일정 유형
            <select {...form.register('type')}>
              <option value="PERSONAL">개인</option>
              <option value="TEAM">팀</option>
              <option value="PROJECT">프로젝트</option>
            </select>
          </label>
          <label>
            공개 범위
            <select disabled value={scheduleTypeDefaults[scheduleType]}>
              <option value={scheduleTypeDefaults[scheduleType]}>
                {scheduleTypeDefaults[scheduleType]}
              </option>
            </select>
          </label>
          {scheduleType === 'PERSONAL' && (
            <label>
              공유 사용자 ID
              <input
                defaultValue={detail.userTargetIds.join(', ')}
                inputMode="numeric"
                onChange={(event) =>
                  form.setValue('userTargetIds', parseIdList(event.target.value), {
                    shouldDirty: true,
                  })
                }
              />
            </label>
          )}
          {scheduleType === 'TEAM' && (
            <label>
              팀 대상 ID
              <input
                defaultValue={detail.teamTargetIds.join(', ')}
                inputMode="numeric"
                onChange={(event) =>
                  form.setValue('teamTargetIds', parseIdList(event.target.value), {
                    shouldDirty: true,
                  })
                }
              />
            </label>
          )}
          {scheduleType === 'PROJECT' && (
            <label>
              프로젝트 대상 ID
              <input
                defaultValue={detail.projectTargetIds.join(', ')}
                inputMode="numeric"
                onChange={(event) =>
                  form.setValue('projectTargetIds', parseIdList(event.target.value), {
                    shouldDirty: true,
                  })
                }
              />
            </label>
          )}
          <label>
            색상 라벨
            <select {...form.register('colorLabel')}>
              {(['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'] as const).map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
          <label>
            참석자 ID
            <input
              defaultValue={detail.participantIds.join(', ')}
              inputMode="numeric"
              onChange={(event) =>
                form.setValue('participantIds', parseIdList(event.target.value), {
                  shouldDirty: true,
                })
              }
            />
          </label>
          <label>
            <input type="checkbox" {...form.register('creatorAttends')} /> 등록자도 참석
          </label>
          <label>
            상세 설명
            <textarea {...form.register('content')} />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="schedule-detail-modal__actions">
            <button disabled={isSaving} onClick={close} ref={closeRef} type="button">
              수정 취소
            </button>
            <button disabled={isSaving} type="submit">
              {isSaving ? '수정 저장 중' : '수정 저장'}
            </button>
          </div>
        </form>
      </section>
      {confirmClose && (
        <div
          aria-labelledby="edit-discard-title"
          aria-modal="true"
          className="schedule-confirmation"
          role="alertdialog"
        >
          <h2 id="edit-discard-title">수정 내용을 버릴까요?</h2>
          <button onClick={() => setConfirmClose(false)} type="button">
            계속 수정
          </button>
          <button onClick={onClose} type="button">
            수정 취소하고 닫기
          </button>
        </div>
      )}
    </div>
  )
}

export function ScheduleCalendar({
  getSchedules = getSchedulesRequest,
  getScheduleDetail = getScheduleDetailRequest,
  updateSchedule = updateScheduleRequest,
  cancelSchedule = cancelScheduleRequest,
  now = () => new Date(),
}: ScheduleCalendarProps) {
  const [state, setState] = useState(() => readState(now))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [cancelConfirmation, setCancelConfirmation] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const scheduleTrigger = useRef<HTMLElement | null>(null)
  const cancellationFocusFallback = useRef<HTMLButtonElement | null>(null)
  const queryClient = useQueryClient()
  const period = getCalendarPeriod(state.view, state.date)
  const scheduleListQueryKey = ['schedules', period.from, period.to] as const
  const schedulesQuery = useQuery({
    queryKey: scheduleListQueryKey,
    queryFn: ({ signal }) => getSchedules(period, signal),
    retry: false,
  })
  const detailQuery = useQuery({
    queryKey: ['schedule-detail', selectedSchedule],
    queryFn: ({ signal }) => getScheduleDetail(selectedSchedule as number, signal),
    enabled: selectedSchedule !== null,
    retry: false,
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateScheduleRequest }) =>
      updateSchedule(id, request),
    onSuccess: (updated) => {
      queryClient.setQueryData<ScheduleSummary[]>(scheduleListQueryKey, (schedules) =>
        schedules?.map((schedule) => (schedule.id === updated.id ? updated : schedule)),
      )
      queryClient.setQueryData(['schedule-detail', updated.id], updated)
      setEditing(false)
      setActionError(null)
    },
    onError: (error) => setActionError(apiErrorText(error, 'update')),
  })
  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelSchedule(id),
    onSuccess: () => {
      if (selectedSchedule !== null) {
        queryClient.setQueryData<ScheduleSummary[]>(scheduleListQueryKey, (schedules) =>
          schedules?.filter((schedule) => schedule.id !== selectedSchedule),
        )
      }
      if (selectedSchedule !== null) {
        queryClient.removeQueries({ queryKey: ['schedule-detail', selectedSchedule] })
      }
      setCancelConfirmation(false)
      setActionError(null)
      setNotice('일정이 취소되었습니다.')
      closeDetail()
      window.setTimeout(() => cancellationFocusFallback.current?.focus(), 0)
    },
    onError: (error) => {
      setCancelConfirmation(false)
      setActionError(apiErrorText(error, 'cancel'))
    },
  })

  const setUrlState = (next: typeof state) => {
    const params = new URLSearchParams({ view: next.view, date: next.date })
    window.history.pushState({}, '', `${window.location.pathname}?${params}`)
    setState(next)
  }
  useEffect(() => {
    const popstate = () => setState(readState(now))
    window.addEventListener('popstate', popstate)
    return () => window.removeEventListener('popstate', popstate)
  }, [now])

  const isMobile = window.innerWidth <= 640
  const daySchedules = (schedulesQuery.data ?? []).filter(
    (schedule) => selectedDate && scheduleOnDate(schedule, selectedDate),
  )
  const openDetail = (schedule: ScheduleSummary, trigger: HTMLElement) => {
    scheduleTrigger.current = trigger
    cancellationFocusFallback.current =
      trigger
        .closest('article')
        ?.querySelector<HTMLButtonElement>('.schedule-calendar__day-button') ?? null
    setSelectedSchedule(schedule.id)
  }
  const closeDetail = () => {
    setSelectedSchedule(null)
    scheduleTrigger.current?.focus()
  }
  const errorStatus = (schedulesQuery.error as { status?: number } | undefined)?.status
  const errorText =
    errorStatus === 401
      ? '인증이 만료되었습니다. 다시 로그인해 주세요.'
      : errorStatus === 403
        ? '일정을 볼 권한이 없습니다.'
        : '일정을 불러오지 못했습니다. 다시 시도해 주세요.'

  return (
    <main className="schedule-calendar">
      <header className="schedule-calendar__header">
        <div>
          <p>CALENDAR</p>
          <h1>{formatCalendarHeading(state.view, state.date)}</h1>
        </div>
        <div className="schedule-calendar__controls">
          <button
            aria-label="이전 기간"
            onClick={() =>
              setUrlState({ ...state, date: navigateDate(state.view, state.date, -1) })
            }
            type="button"
          >
            이전
          </button>
          {(['month', 'week', 'day'] as const).map((view) => (
            <button
              aria-pressed={state.view === view}
              key={view}
              onClick={() => setUrlState({ ...state, view })}
              type="button"
            >
              {view === 'month' ? '월간 보기' : view === 'week' ? '주간 보기' : '일간 보기'}
            </button>
          ))}
          <button
            aria-label="다음 기간"
            onClick={() => setUrlState({ ...state, date: navigateDate(state.view, state.date, 1) })}
            type="button"
          >
            다음
          </button>
        </div>
      </header>
      {schedulesQuery.isLoading && <p role="status">일정을 불러오고 있습니다.</p>}
      {notice && <p role="status">{notice}</p>}
      {schedulesQuery.isError && (
        <section className="schedule-calendar__state" role="alert">
          <p>{errorText}</p>
          <button onClick={() => void schedulesQuery.refetch()} type="button">
            다시 시도
          </button>
        </section>
      )}
      {schedulesQuery.isSuccess && schedulesQuery.data.length === 0 && (
        <p className="schedule-calendar__state">이 기간에는 일정이 없습니다.</p>
      )}
      {schedulesQuery.isSuccess && (
        <section
          aria-label={`${formatCalendarHeading(state.view, state.date)} 달력`}
          className={`schedule-calendar__grid schedule-calendar__grid--${state.view}`}
        >
          {calendarDays(state.view, state.date).map((day) => (
            <article className="schedule-calendar__day" key={day}>
              <button
                aria-label={`${koreanDate(day)} 일정 보기`}
                className="schedule-calendar__day-button"
                onClick={() => setSelectedDate(day)}
                type="button"
              >
                {Number(day.slice(-2))}
              </button>
              {(schedulesQuery.data ?? [])
                .filter((schedule) => schedule.startAt.slice(0, 10) === day)
                .map((schedule) => (
                  <button
                    className={`schedule-chip schedule-chip--${schedule.colorLabel.toLowerCase()}`}
                    key={schedule.id}
                    onClick={(event) => openDetail(schedule, event.currentTarget)}
                    type="button"
                  >
                    {typeLabel(schedule.type)} · {schedule.colorLabel} ·{' '}
                    {schedule.allDay ? '종일 · ' : ''}
                    {schedule.title}
                  </button>
                ))}
            </article>
          ))}
        </section>
      )}
      {selectedDate && (
        <aside
          aria-label={`${koreanDate(selectedDate)} 일정`}
          aria-modal={isMobile || undefined}
          className={isMobile ? 'schedule-banner schedule-banner--overlay' : 'schedule-banner'}
          role={isMobile ? 'dialog' : 'complementary'}
        >
          <header>
            <h2>{selectedDate} 일정</h2>
            <button onClick={() => setSelectedDate(null)} type="button">
              닫기
            </button>
          </header>
          {daySchedules.length === 0 ? (
            <p>선택한 날짜에는 일정이 없습니다.</p>
          ) : (
            <ul>
              {daySchedules.map((schedule) => (
                <li key={schedule.id}>
                  <button
                    className="schedule-chip"
                    onClick={(event) => openDetail(schedule, event.currentTarget)}
                    type="button"
                  >
                    {typeLabel(schedule.type)} · {schedule.colorLabel} ·{' '}
                    {schedule.allDay ? '종일 · ' : ''}
                    {schedule.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
      {selectedSchedule !== null && detailQuery.isLoading && (
        <p role="status">일정 상세를 불러오고 있습니다.</p>
      )}
      {detailQuery.data && !editing && (
        <DetailModal
          detail={detailQuery.data}
          canManage={detailQuery.data.canManage}
          error={actionError}
          onCancel={() => setCancelConfirmation(true)}
          onClose={closeDetail}
          onEdit={() => {
            setActionError(null)
            setEditing(true)
          }}
        />
      )}
      {detailQuery.data && editing && (
        <EditModal
          detail={detailQuery.data}
          error={actionError}
          isSaving={updateMutation.isPending}
          onClose={() => setEditing(false)}
          onSave={(request) => updateMutation.mutate({ id: detailQuery.data.id, request })}
        />
      )}
      {detailQuery.data && cancelConfirmation && (
        <div
          aria-labelledby="cancel-title"
          aria-modal="true"
          className="schedule-confirmation"
          role="alertdialog"
        >
          <h2 id="cancel-title">{detailQuery.data.title} 취소</h2>
          <p>취소한 일정은 캘린더와 상세에서 사라집니다.</p>
          <button
            disabled={cancelMutation.isPending}
            onClick={() => setCancelConfirmation(false)}
            type="button"
          >
            계속 일정 보기
          </button>
          <button
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate(detailQuery.data.id)}
            type="button"
          >
            {cancelMutation.isPending ? '일정 취소 중' : '일정 취소 확정'}
          </button>
        </div>
      )}
      {detailQuery.isError && <p role="alert">일정 상세를 불러오지 못했습니다.</p>}
    </main>
  )
}
