import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
  calendarDays,
  formatCalendarHeading,
  formatScheduleTimeRange,
  getCalendarPeriod,
  navigateDate,
  type CalendarView,
} from './calendarDate'
import { layoutDayTimelineSchedules } from './dayTimeline'
import {
  getScheduleDetail as getScheduleDetailRequest,
  getSchedules as getSchedulesRequest,
  cancelSchedule as cancelScheduleRequest,
  cancelRoomReservation as cancelRoomReservationRequest,
  updateSchedule as updateScheduleRequest,
  type ScheduleDetail,
  type ScheduleSummary,
  type ScheduleType,
  type UpdateScheduleRequest,
} from './scheduleCalendarApi'
import { getScheduleColorClasses } from './scheduleColor'
import {
  ConfirmationDialog,
  confirmationDangerActionClass,
  confirmationSecondaryActionClass,
} from '../../shared/ui/ConfirmationDialog'
import { AttendeeSelector } from '../schedule-create/AttendeeSelector'
import {
  getScheduleTargetOptions as getScheduleTargetOptionsRequest,
  searchAttendees as searchAttendeesRequest,
  type AttendeeCandidate,
  type ScheduleTargetOption,
  type ScheduleTargetOptions,
} from '../schedule-create/scheduleCreateApi'
import {
  scheduleFormSchema,
  scheduleTypeDefaults,
  toScheduleRequest,
  type ScheduleFormValues,
} from '../schedule-create/scheduleForm'

const controlButtonClass =
  'rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-text-primary transition hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'
const activeControlButtonClass =
  'rounded-lg border border-primary bg-secondary px-3 py-2 font-semibold text-text-primary transition focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'
const chipBaseClass =
  'mt-1 block w-full overflow-hidden rounded-md border px-2 py-1 text-left text-xs font-medium text-ellipsis whitespace-nowrap focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-1 sm:text-sm'
const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-background'
const labelClass = 'grid gap-1.5 font-semibold text-text-primary'
const checkboxLabelClass = 'flex items-center gap-2 font-semibold text-text-primary'
const checkboxClass = 'h-4 w-4 shrink-0 accent-primary'
const modalCloseButtonClass =
  'absolute top-4 right-4 rounded p-1 text-text-secondary transition hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
const modalFooterClass = 'mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end'
const primaryModalActionClass =
  'w-full rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70 sm:w-auto'

export interface ScheduleCalendarProps {
  getSchedules?: (
    period: { from: string; to: string },
    signal?: AbortSignal,
  ) => Promise<ScheduleSummary[]>
  getScheduleDetail?: (id: number, signal?: AbortSignal) => Promise<ScheduleDetail>
  updateSchedule?: (id: number, request: UpdateScheduleRequest) => Promise<ScheduleDetail>
  cancelSchedule?: (id: number) => Promise<void>
  searchAttendees?: (query: string) => Promise<AttendeeCandidate[]>
  getTargetOptions?: () => Promise<ScheduleTargetOptions>
  cancelRoomReservation?: (reservationId: number) => Promise<void>
  onCreateSchedule?: () => void
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

function colorOptionLabel(color: ScheduleSummary['colorLabel']): string {
  return {
    RED: '빨강',
    ORANGE: '주황',
    YELLOW: '노랑',
    GREEN: '초록',
    BLUE: '파랑',
    PURPLE: '보라',
  }[color]
}

function ScheduleChip({
  schedule,
  onOpen,
  testId,
}: {
  schedule: ScheduleSummary
  onOpen: (schedule: ScheduleSummary, trigger: HTMLButtonElement) => void
  testId?: string
}) {
  const color = getScheduleColorClasses(schedule.colorLabel)
  return (
    <button
      className={`${chipBaseClass} ${color.background} ${color.border} ${color.text}`}
      data-testid={testId}
      onClick={(event) => onOpen(schedule, event.currentTarget)}
      type="button"
    >
      {schedule.title} · {typeLabel(schedule.type)}
    </button>
  )
}

function DayTimeline({
  date,
  schedules,
  onOpen,
}: {
  date: string
  schedules: ScheduleSummary[]
  onOpen: (schedule: ScheduleSummary, trigger: HTMLButtonElement) => void
}) {
  const allDaySchedules = schedules.filter((schedule) => schedule.allDay)
  const timedSchedules = schedules.filter((schedule) => !schedule.allDay)
  const placements = layoutDayTimelineSchedules(date, timedSchedules)
  const schedulesById = new Map(timedSchedules.map((schedule) => [schedule.id, schedule]))
  return (
    <section
      aria-label={`${koreanDate(date)} 일간 시간표`}
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
    >
      <div className="border-b border-border p-3" data-testid="calendar-day-all-day">
        <p className="mb-2 text-sm font-bold text-text-primary">하루 종일</p>
        {allDaySchedules.length === 0 ? (
          <p className="text-sm text-text-secondary">종일 일정이 없습니다.</p>
        ) : (
          allDaySchedules.map((schedule) => (
            <ScheduleChip key={schedule.id} onOpen={onOpen} schedule={schedule} />
          ))
        )}
      </div>
      <div className="grid grid-cols-[4rem_minmax(0,1fr)]" data-testid="calendar-day-timeline">
        <div className="border-r border-border bg-secondary" data-testid="calendar-day-time-labels">
          {Array.from({ length: 25 }, (_, hour) => (
            <div
              className={
                hour === 24
                  ? 'relative h-0 -top-2 px-2 text-right text-xs text-text-secondary'
                  : 'h-[60px] px-2 pt-1 text-right text-xs text-text-secondary'
              }
              key={hour}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div className="relative h-[1440px] bg-surface">
          {Array.from({ length: 24 }, (_, hour) => (
            <div className="h-[60px] border-b border-border/70" key={hour} />
          ))}
          {placements.map((placement) => {
            const schedule = schedulesById.get(placement.id)
            if (!schedule) {
              return null
            }
            const color = getScheduleColorClasses(schedule.colorLabel)
            return (
              <button
                className={`absolute right-2 left-2 overflow-hidden rounded-md border px-2 py-1 text-left text-xs font-medium ${color.background} ${color.border} ${color.text} focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-1`}
                data-testid={`calendar-day-timed-${schedule.id}`}
                key={schedule.id}
                onClick={(event) => onOpen(schedule, event.currentTarget)}
                style={{
                  top: `${placement.top}px`,
                  height: `${placement.height}px`,
                  left: `calc(${(placement.column / placement.columnCount) * 100}% + 0.5rem)`,
                  right: `calc(${((placement.columnCount - placement.column - 1) / placement.columnCount) * 100}% + 0.5rem)`,
                }}
                type="button"
              >
                {schedule.title} · {typeLabel(schedule.type)} ·{' '}
                {formatScheduleTimeRange(schedule.startAt, schedule.endAt, false)}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function apiErrorText(
  error: unknown,
  action: 'update' | 'cancel' | 'roomReservationCancel',
): string {
  const status = (error as { status?: number } | undefined)?.status
  if (status === 401) {
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  }
  if (status === 403) {
    return action === 'roomReservationCancel'
      ? '이 예약을 취소할 권한이 없습니다.'
      : `이 일정을 ${action === 'cancel' ? '취소' : '수정'}할 권한이 없습니다.`
  }
  if (status === 404) {
    return action === 'roomReservationCancel'
      ? '예약을 찾을 수 없습니다. 목록을 새로고침해 주세요.'
      : '일정을 찾을 수 없습니다. 목록을 새로고침해 주세요.'
  }
  if (status === 409) {
    return action === 'roomReservationCancel'
      ? '예약 취소 중 충돌이 발생했습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.'
      : '회의실 예약 관리 일정입니다. 회의실 예약 취소 흐름을 사용해 주세요.'
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
  hasConfirmation,
}: {
  detail: ScheduleDetail
  canManage: boolean
  onClose: () => void
  onEdit: () => void
  onCancel: (trigger: HTMLButtonElement) => void
  error: string | null
  hasConfirmation: boolean
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const participants = detail.participants ?? []
  const attendeeCount = detail.attendeeCount ?? participants.length + Number(detail.creatorAttends)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !hasConfirmation) {
        onClose()
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [hasConfirmation, onClose])

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      aria-labelledby="schedule-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-10 grid place-items-center bg-slate-950/55 p-4"
      data-testid="schedule-detail-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
    >
      <section className="relative w-full max-w-lg rounded-xl bg-surface p-6 shadow-2xl">
        <h2 className="m-0 text-xl font-bold text-text-primary" id="schedule-detail-title">
          {detail.title}
        </h2>
        <button
          aria-label="닫기"
          className={modalCloseButtonClass}
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          ×
        </button>
        <p className="text-text-secondary">{typeLabel(detail.type)} 일정</p>
        <p>{formatScheduleTimeRange(detail.startAt, detail.endAt, detail.allDay)}</p>
        {detail.location && <p>위치: {detail.location}</p>}
        {detail.content && <p>{detail.content}</p>}
        <section
          aria-label="참석자 정보"
          className="mt-4 grid gap-2 rounded-md border border-border p-3"
        >
          <p className="font-semibold">참석 인원: {attendeeCount}명</p>
          <p>등록자 참석: {detail.creatorAttends ? '예' : '아니요'}</p>
          <div>
            <p className="font-semibold">다른 참석자</p>
            {participants.length === 0 ? (
              <p>다른 참석자가 없습니다.</p>
            ) : (
              <ul aria-label="다른 참석자 목록" className="grid gap-1">
                {participants.map((participant) => (
                  <li key={participant.userId}>{participant.displayName}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
        {detail.meetingRoomManaged}
        {error && <p role="alert">{error}</p>}
        {canManage && !detail.meetingRoomManaged && (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button className={controlButtonClass} onClick={onEdit} type="button">
              일정 수정
            </button>
            <button
              className="rounded-lg border border-red-700 bg-red-700 px-3 py-2 font-semibold text-white focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
              onClick={(event) => onCancel(event.currentTarget)}
              type="button"
            >
              일정 취소
            </button>
          </div>
        )}
        {detail.meetingRoomManaged &&
          detail.canCancelRoomReservation &&
          detail.roomReservationId !== null && (
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-lg border border-red-700 bg-red-700 px-3 py-2 font-semibold text-white focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
                onClick={(event) => onCancel(event.currentTarget)}
                type="button"
              >
                예약 취소
              </button>
            </div>
          )}
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
  searchAttendees,
  getTargetOptions,
}: {
  detail: ScheduleDetail
  onClose: () => void
  onSave: (request: UpdateScheduleRequest) => void
  error: string | null
  isSaving: boolean
  searchAttendees: (query: string) => Promise<AttendeeCandidate[]>
  getTargetOptions: () => Promise<ScheduleTargetOptions>
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
  const creatorAttends = useWatch({ control: form.control, name: 'creatorAttends' })
  const teamTargetIds = useWatch({ control: form.control, name: 'teamTargetIds' })
  const projectTargetIds = useWatch({ control: form.control, name: 'projectTargetIds' })
  const [selectedAttendees, setSelectedAttendees] = useState<AttendeeCandidate[]>(
    detail.participants ?? [],
  )
  const [personalRelationNotice, setPersonalRelationNotice] = useState('')
  const targetOptions = useQuery({
    queryKey: ['schedule', 'target-options'],
    queryFn: getTargetOptions,
    enabled: scheduleType === 'TEAM' || scheduleType === 'PROJECT',
    retry: false,
  })
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  useEffect(() => {
    form.setValue('visibility', scheduleTypeDefaults[scheduleType], { shouldValidate: true })
  }, [form, scheduleType])
  const handleScheduleTypeChange = (nextType: ScheduleType) => {
    if (nextType !== scheduleType) {
      form.setValue('teamTargetIds', [], { shouldDirty: teamTargetIds.length > 0 })
      form.setValue('projectTargetIds', [], { shouldDirty: projectTargetIds.length > 0 })
    }
    if (nextType === 'PERSONAL' && scheduleType !== 'PERSONAL') {
      setSelectedAttendees([])
      form.setValue('participantIds', [], { shouldDirty: true })
      form.setValue('userTargetIds', [], { shouldDirty: true })
      setPersonalRelationNotice(
        '개인 일정은 등록자 전용이므로 참석자와 사용자 공유 대상을 제거했습니다.',
      )
    }
  }
  const changeAttendees = (attendees: AttendeeCandidate[]) => {
    setSelectedAttendees(attendees)
    form.setValue(
      'participantIds',
      attendees.map(({ userId }) => userId),
      { shouldDirty: true },
    )
  }
  const close = useCallback(() => {
    if (form.formState.isDirty && !isSaving) {
      setConfirmClose(true)
    } else {
      onClose()
    }
  }, [form.formState.isDirty, isSaving, onClose])
  const submit = (values: ScheduleFormValues) => {
    onSave(toScheduleRequest(values))
  }
  const toggleTarget = (targetField: 'teamTargetIds' | 'projectTargetIds', targetId: number) => {
    const currentTargetIds = form.getValues(targetField)
    form.setValue(
      targetField,
      currentTargetIds.includes(targetId)
        ? currentTargetIds.filter((id) => id !== targetId)
        : [...currentTargetIds, targetId],
      { shouldDirty: true, shouldValidate: true },
    )
  }
  const totalAttendees = selectedAttendees.length + (creatorAttends ? 1 : 0)
  const targetField = scheduleType === 'TEAM' ? 'teamTargetIds' : 'projectTargetIds'
  const targetOptionsForType: ScheduleTargetOption[] =
    scheduleType === 'TEAM'
      ? (targetOptions.data?.teams ?? [])
      : (targetOptions.data?.projects ?? [])
  const selectedTargetIds = scheduleType === 'TEAM' ? teamTargetIds : projectTargetIds
  const targetLabel = scheduleType === 'TEAM' ? '팀 대상' : '프로젝트 대상'
  const targetEmptyMessage =
    scheduleType === 'TEAM' ? '선택 가능한 팀이 없습니다.' : '선택 가능한 프로젝트가 없습니다.'
  const targetErrorId =
    scheduleType === 'TEAM'
      ? 'schedule-edit-team-targets-error'
      : 'schedule-edit-project-targets-error'
  const targetError = form.formState.errors[targetField]
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (confirmClose) {
        setConfirmClose(false)
      } else {
        close()
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [close, confirmClose])
  return (
    <div
      aria-labelledby="schedule-edit-title"
      aria-modal="true"
      className="fixed inset-0 z-10 overflow-auto bg-slate-950/55 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close()
        }
      }}
      role="dialog"
    >
      <section
        className="relative mx-auto my-0 w-full max-w-2xl rounded-xl bg-surface p-4 shadow-2xl sm:my-8 sm:p-6"
        data-testid="schedule-edit-panel"
      >
        <h2 className="m-0 text-xl font-bold text-text-primary" id="schedule-edit-title">
          일정 수정
        </h2>
        <button
          aria-label="닫기"
          className={modalCloseButtonClass}
          disabled={isSaving}
          onClick={close}
          ref={closeRef}
          type="button"
        >
          ×
        </button>
        <form
          className="mt-4 grid gap-3"
          noValidate
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
        >
          <label className={labelClass} htmlFor="schedule-edit-title-input">
            제목
          </label>
          <input
            aria-describedby={form.formState.errors.title ? 'schedule-edit-title-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.title)}
            className={fieldClass}
            id="schedule-edit-title-input"
            {...form.register('title')}
          />
          {form.formState.errors.title && (
            <p id="schedule-edit-title-error" role="alert">
              {form.formState.errors.title.message}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3" data-testid="schedule-edit-form-grid">
            <label className={labelClass}>
              날짜
              <input
                aria-describedby={
                  form.formState.errors.date ? 'schedule-edit-date-error' : undefined
                }
                aria-invalid={Boolean(form.formState.errors.date)}
                className={fieldClass}
                type="date"
                {...form.register('date')}
              />
            </label>
            <label className={labelClass}>
              시작 시간
              <input
                className={fieldClass}
                disabled={allDay}
                type="time"
                {...form.register('startTime')}
              />
            </label>
            <label className={labelClass}>
              종료 시간
              <input
                className={fieldClass}
                disabled={allDay}
                type="time"
                {...form.register('endTime')}
              />
            </label>
          </div>
          {form.formState.errors.date && (
            <p id="schedule-edit-date-error" role="alert">
              {form.formState.errors.date.message}
            </p>
          )}
          {form.formState.errors.endTime && (
            <p role="alert">{form.formState.errors.endTime.message}</p>
          )}
          <label className={checkboxLabelClass} data-testid="schedule-edit-all-day-field">
            <input className={checkboxClass} type="checkbox" {...form.register('allDay')} />
            하루종일
          </label>
          <label className={labelClass}>
            위치
            <input className={fieldClass} {...form.register('location')} />
          </label>
          <label className={labelClass}>
            일정 유형
            <select
              className={fieldClass}
              {...form.register('type', {
                onChange: (event: { target: HTMLSelectElement }) =>
                  handleScheduleTypeChange(event.target.value as ScheduleType),
              })}
            >
              <option value="PERSONAL">개인</option>
              <option value="TEAM">팀</option>
              <option value="PROJECT">프로젝트</option>
            </select>
          </label>
          <label className={labelClass}>
            공개 범위
            <select
              aria-label="공개 범위"
              className={fieldClass}
              disabled
              value={scheduleTypeDefaults[scheduleType]}
            >
              <option value={scheduleTypeDefaults[scheduleType]}>
                {typeLabel(scheduleType)} 공개
              </option>
            </select>
          </label>
          {(scheduleType === 'TEAM' || scheduleType === 'PROJECT') && (
            <fieldset
              aria-describedby={targetError ? targetErrorId : undefined}
              aria-invalid={Boolean(targetError)}
              className="grid min-w-0 gap-2 rounded-md border border-border p-3"
            >
              <legend className="px-1 font-semibold text-text-primary">{targetLabel}</legend>
              {targetOptions.isLoading && <p role="status">일정 대상 목록을 불러오고 있습니다.</p>}
              {targetOptions.isError && (
                <div className="grid gap-2" role="alert">
                  <p>일정 대상 목록을 불러오지 못했습니다. 다시 시도해 주세요.</p>
                  <button
                    className={controlButtonClass}
                    onClick={() => void targetOptions.refetch()}
                    type="button"
                  >
                    대상 목록 다시 시도
                  </button>
                </div>
              )}
              {!targetOptions.isLoading &&
                !targetOptions.isError &&
                targetOptionsForType.length === 0 && <p role="status">{targetEmptyMessage}</p>}
              {!targetOptions.isLoading &&
                !targetOptions.isError &&
                targetOptionsForType.length > 0 && (
                  <div className="grid gap-2">
                    {targetOptionsForType.map((option) => (
                      <label className={checkboxLabelClass} key={option.id}>
                        <input
                          checked={selectedTargetIds.includes(option.id)}
                          className={checkboxClass}
                          onChange={() => toggleTarget(targetField, option.id)}
                          type="checkbox"
                        />
                        {option.name}
                      </label>
                    ))}
                  </div>
                )}
              {targetError && (
                <p id={targetErrorId} role="alert">
                  {targetError.message}
                </p>
              )}
            </fieldset>
          )}
          <label className={labelClass}>
            색상 라벨
            <select className={fieldClass} {...form.register('colorLabel')}>
              {(['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'] as const).map((color) => (
                <option key={color} value={color}>
                  {colorOptionLabel(color)}
                </option>
              ))}
            </select>
          </label>
          {(scheduleType === 'TEAM' || scheduleType === 'PROJECT') && (
            <>
              <AttendeeSelector
                onChange={changeAttendees}
                searchAttendees={searchAttendees}
                selected={selectedAttendees}
              />
              <p>자동 참석 인원: {totalAttendees}명</p>
            </>
          )}
          {personalRelationNotice && <p role="status">{personalRelationNotice}</p>}
          <label className={checkboxLabelClass} data-testid="schedule-edit-creator-attends-field">
            <input className={checkboxClass} type="checkbox" {...form.register('creatorAttends')} />
            등록자도 참석
          </label>
          <label className={labelClass}>
            상세 설명
            <textarea className={fieldClass} {...form.register('content')} />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className={modalFooterClass}>
            <button className={primaryModalActionClass} disabled={isSaving} type="submit">
              {isSaving ? '수정 저장 중' : '수정 저장'}
            </button>
          </div>
        </form>
      </section>
      {confirmClose && (
        <ConfirmationDialog
          description="저장하지 않은 수정 내용은 사라집니다."
          footer={
            <>
              <button
                className={confirmationSecondaryActionClass}
                onClick={() => setConfirmClose(false)}
                type="button"
              >
                계속 수정
              </button>
              <button className={confirmationDangerActionClass} onClick={onClose} type="button">
                수정 취소하고 닫기
              </button>
            </>
          }
          onDismiss={() => setConfirmClose(false)}
          title="수정 내용을 버릴까요?"
          titleId="edit-discard-title"
        />
      )}
    </div>
  )
}

export function ScheduleCalendar({
  getSchedules = getSchedulesRequest,
  getScheduleDetail = getScheduleDetailRequest,
  updateSchedule = updateScheduleRequest,
  cancelSchedule = cancelScheduleRequest,
  searchAttendees = searchAttendeesRequest,
  getTargetOptions = getScheduleTargetOptionsRequest,
  cancelRoomReservation = cancelRoomReservationRequest,
  onCreateSchedule,
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
  const selectedDateTrigger = useRef<HTMLButtonElement | null>(null)
  const cancellationFocusFallback = useRef<HTMLButtonElement | null>(null)
  const cancellationTrigger = useRef<HTMLButtonElement | null>(null)
  const cancellationSubmitted = useRef(false)
  const cancelCloseRef = useRef<HTMLButtonElement>(null)
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
    mutationFn: ({ id, kind }: { id: number; kind: 'schedule' | 'roomReservation' }) =>
      kind === 'roomReservation' ? cancelRoomReservation(id) : cancelSchedule(id),
    onSuccess: () => {
      cancellationSubmitted.current = false
      if (selectedSchedule !== null) {
        queryClient.setQueryData<ScheduleSummary[]>(scheduleListQueryKey, (schedules) =>
          schedules?.filter((schedule) => schedule.id !== selectedSchedule),
        )
      }
      if (selectedSchedule !== null) {
        queryClient.removeQueries({ queryKey: ['schedule-detail', selectedSchedule] })
      }
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['schedule-detail'] })
      void queryClient.invalidateQueries({ queryKey: ['meeting-room'] })
      setCancelConfirmation(false)
      setActionError(null)
      setNotice(
        detailQuery.data?.meetingRoomManaged
          ? '회의실 예약과 연결 일정이 취소되었습니다.'
          : '일정이 취소되었습니다.',
      )
      closeDetail()
      window.setTimeout(() => cancellationFocusFallback.current?.focus(), 0)
    },
    onError: (error, variables) => {
      cancellationSubmitted.current = false
      setCancelConfirmation(false)
      setActionError(
        apiErrorText(
          error,
          variables.kind === 'roomReservation' ? 'roomReservationCancel' : 'cancel',
        ),
      )
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
  const daySchedules = (schedulesQuery.data ?? []).filter(
    (schedule) => selectedDate && scheduleOnDate(schedule, selectedDate),
  )
  const openDetail = (schedule: ScheduleSummary, trigger: HTMLElement) => {
    scheduleTrigger.current = trigger
    cancellationFocusFallback.current =
      trigger.closest('article')?.querySelector<HTMLButtonElement>('[data-calendar-day-button]') ??
      null
    setSelectedSchedule(schedule.id)
  }
  const closeDetail = () => {
    queryClient.removeQueries({ queryKey: ['schedule', 'attendee-candidates'] })
    setSelectedSchedule(null)
    scheduleTrigger.current?.focus()
  }
  const closeDatePanel = () => {
    setSelectedDate(null)
    window.setTimeout(() => selectedDateTrigger.current?.focus(), 0)
  }
  const dismissCancellation = () => {
    setCancelConfirmation(false)
    window.setTimeout(() => cancellationTrigger.current?.focus(), 0)
  }
  const errorStatus = (schedulesQuery.error as { status?: number } | undefined)?.status
  const errorText =
    errorStatus === 401
      ? '인증이 만료되었습니다. 다시 로그인해 주세요.'
      : errorStatus === 403
        ? '일정을 볼 권한이 없습니다.'
        : '일정을 불러오지 못했습니다. 다시 시도해 주세요.'
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <main className="min-h-screen overflow-x-hidden p-4 sm:p-8">
      <header
        className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-x-8"
        data-testid="calendar-header"
      >
        <div className="min-w-0">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            {formatCalendarHeading(state.view, state.date)}
          </h1>
        </div>
        <div
          className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end"
          data-testid="calendar-header-actions"
        >
          <div
            aria-label="기간 이동"
            className="flex items-center gap-2"
            data-testid="calendar-period-controls"
            role="group"
          >
            <button
              onClick={() =>
                setUrlState({ ...state, date: navigateDate(state.view, state.date, -1) })
              }
              className={controlButtonClass}
              type="button"
            >
              이전
            </button>
            <button
              className={controlButtonClass}
              onClick={() => setUrlState({ ...state, date: dateValue(now()) })}
              type="button"
            >
              오늘
            </button>
            <button
              onClick={() =>
                setUrlState({ ...state, date: navigateDate(state.view, state.date, 1) })
              }
              className={controlButtonClass}
              type="button"
            >
              다음
            </button>
          </div>
          <div
            aria-label="보기 선택"
            className="flex flex-wrap items-center gap-2"
            data-testid="calendar-view-controls"
            role="group"
          >
            {(['month', 'week', 'day'] as const).map((view) => (
              <button
                aria-pressed={state.view === view}
                className={state.view === view ? activeControlButtonClass : controlButtonClass}
                key={view}
                onClick={() => setUrlState({ ...state, view })}
                type="button"
              >
                {view === 'month' ? '월간 보기' : view === 'week' ? '주간 보기' : '일간 보기'}
              </button>
            ))}
          </div>
          {onCreateSchedule && (
            <button
              className="ml-auto rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
              data-testid="calendar-create-action"
              onClick={onCreateSchedule}
              type="button"
            >
              일정 추가
            </button>
          )}
        </div>
      </header>
      {schedulesQuery.isLoading && (
        <p className="mb-4 text-text-secondary" role="status">
          일정을 불러오고 있습니다.
        </p>
      )}
      {notice && (
        <p className="mb-4 text-text-secondary" role="status">
          {notice}
        </p>
      )}
      {schedulesQuery.isError && (
        <section className="my-8 rounded-lg bg-surface p-4 shadow-md" role="alert">
          <p>{errorText}</p>
          <button
            className={controlButtonClass}
            onClick={() => void schedulesQuery.refetch()}
            type="button"
          >
            다시 시도
          </button>
        </section>
      )}
      {schedulesQuery.isSuccess && schedulesQuery.data.length === 0 && (
        <p className="my-8 rounded-lg bg-surface p-4 shadow-md">이 기간에는 일정이 없습니다.</p>
      )}
      {schedulesQuery.isSuccess &&
        (state.view === 'day' ? (
          <DayTimeline
            date={state.date}
            onOpen={openDetail}
            schedules={(schedulesQuery.data ?? []).filter((schedule) =>
              scheduleOnDate(schedule, state.date),
            )}
          />
        ) : (
          <section
            aria-label={`${formatCalendarHeading(state.view, state.date)} 달력`}
            className="grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-border shadow-lg"
            data-testid="calendar-grid"
            role="grid"
          >
            {weekdays.map((weekday) => (
              <div
                className="bg-secondary px-2 py-2 text-center text-sm font-bold text-text-secondary"
                data-testid={`calendar-weekday-${weekday}`}
                key={weekday}
                role="columnheader"
              >
                {weekday}
              </div>
            ))}
            {calendarDays(state.view, state.date).map((day) => {
              const outsideMonth =
                state.view === 'month' && day.slice(0, 7) !== state.date.slice(0, 7)
              return (
                <article
                  className={`min-h-20 min-w-0 bg-surface p-1 sm:min-h-28 sm:p-2 ${outsideMonth ? 'bg-background/60' : ''}`}
                  key={day}
                  role="gridcell"
                >
                  {!outsideMonth && (
                    <>
                      <button
                        aria-label={`${koreanDate(day)} 일정 보기`}
                        className="rounded px-1 py-0.5 text-xs font-bold text-text-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-1 sm:text-sm"
                        data-calendar-day-button
                        onClick={(event) => {
                          selectedDateTrigger.current = event.currentTarget
                          setSelectedDate(day)
                        }}
                        type="button"
                      >
                        {Number(day.slice(-2))}
                      </button>
                      {(schedulesQuery.data ?? [])
                        .filter((schedule) => schedule.startAt.slice(0, 10) === day)
                        .map((schedule) => (
                          <ScheduleChip
                            key={schedule.id}
                            onOpen={openDetail}
                            schedule={schedule}
                            testId={`calendar-schedule-chip-${schedule.id}`}
                          />
                        ))}
                    </>
                  )}
                </article>
              )
            })}
          </section>
        ))}
      {selectedDate && (
        <div
          className="fixed inset-0 z-10 bg-slate-950/55"
          data-testid="calendar-date-panel-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDatePanel()
            }
          }}
        >
          <aside
            aria-label={`${koreanDate(selectedDate)} 일정`}
            aria-modal="true"
            className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-background p-4 shadow-2xl sm:p-6"
            role="dialog"
          >
            <header className="mb-4 flex items-center justify-between gap-3">
              <h2 className="m-0 text-xl font-bold text-text-primary">
                {koreanDate(selectedDate)} 일정
              </h2>
              <button
                aria-label="닫기"
                className="rounded p-2 text-text-primary focus-visible:outline-3 focus-visible:outline-focus-ring"
                onClick={closeDatePanel}
                type="button"
              >
                ×
              </button>
            </header>
            <DayTimeline date={selectedDate} onOpen={openDetail} schedules={daySchedules} />
          </aside>
        </div>
      )}
      {selectedSchedule !== null && detailQuery.isLoading && (
        <p role="status">일정 상세를 불러오고 있습니다.</p>
      )}
      {detailQuery.data && !editing && (
        <DetailModal
          detail={detailQuery.data}
          canManage={detailQuery.data.canManage}
          error={actionError}
          hasConfirmation={cancelConfirmation}
          onCancel={(trigger) => {
            cancellationTrigger.current = trigger
            setCancelConfirmation(true)
          }}
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
          onClose={() => {
            queryClient.removeQueries({ queryKey: ['schedule', 'attendee-candidates'] })
            setEditing(false)
          }}
          onSave={(request) => updateMutation.mutate({ id: detailQuery.data.id, request })}
          searchAttendees={searchAttendees}
          getTargetOptions={getTargetOptions}
        />
      )}
      {detailQuery.data && cancelConfirmation && (
        <ConfirmationDialog
          closeButtonRef={cancelCloseRef}
          description={
            detailQuery.data.meetingRoomManaged
              ? '취소한 예약과 연결된 일정이 함께 취소되어 캘린더와 회의실 예약 현황에서 사라집니다.'
              : '취소한 일정은 캘린더와 상세에서 사라집니다.'
          }
          footer={
            <>
              <button
                className={confirmationSecondaryActionClass}
                disabled={cancelMutation.isPending}
                onClick={dismissCancellation}
                type="button"
              >
                {detailQuery.data.meetingRoomManaged ? '계속 예약 보기' : '계속 일정 보기'}
              </button>
              <button
                className={confirmationDangerActionClass}
                disabled={cancelMutation.isPending}
                onClick={() => {
                  if (cancellationSubmitted.current) {
                    return
                  }
                  cancellationSubmitted.current = true
                  cancelMutation.mutate(
                    detailQuery.data.meetingRoomManaged
                      ? {
                          id: detailQuery.data.roomReservationId as number,
                          kind: 'roomReservation',
                        }
                      : { id: detailQuery.data.id, kind: 'schedule' },
                  )
                }}
                type="button"
              >
                {cancelMutation.isPending
                  ? detailQuery.data.meetingRoomManaged
                    ? '예약 취소 중'
                    : '일정 취소 중'
                  : detailQuery.data.meetingRoomManaged
                    ? '예약 취소 확정'
                    : '일정 취소 확정'}
              </button>
            </>
          }
          isCloseDisabled={cancelMutation.isPending}
          onDismiss={dismissCancellation}
          title={`${detailQuery.data.title}${detailQuery.data.meetingRoomManaged ? ' 예약' : ''} 취소`}
          titleId="cancel-title"
        />
      )}
      {detailQuery.isError && <p role="alert">일정 상세를 불러오지 못했습니다.</p>}
    </main>
  )
}
