import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
  type AttendeeCandidate,
  type CreateScheduleRequest,
  type ScheduleType,
  ScheduleApiError,
  createSchedule as createScheduleRequest,
  searchAttendees as searchAttendeesRequest,
} from './scheduleCreateApi'
import {
  parseIdList,
  scheduleFormSchema,
  scheduleTypeDefaults,
  toScheduleRequest,
  type ScheduleFormValues,
} from './scheduleForm'

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-background'
const labelClass = 'grid gap-1.5 font-semibold text-text-primary'
const secondaryButtonClass =
  'rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-text-primary hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'

export interface ScheduleCreateModalProps {
  onClose: () => void
  createSchedule?: (request: CreateScheduleRequest) => Promise<void>
  searchAttendees?: (query: string) => Promise<AttendeeCandidate[]>
}

function typeLabel(type: ScheduleType): string {
  return { PERSONAL: '개인', TEAM: '팀', PROJECT: '프로젝트' }[type]
}

export function ScheduleCreateModal({
  onClose,
  createSchedule = createScheduleRequest,
  searchAttendees = searchAttendeesRequest,
}: ScheduleCreateModalProps) {
  const lastFocusedElement = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const [dirtyCloseConfirmation, setDirtyCloseConfirmation] = useState(false)
  const [attendeeQuery, setAttendeeQuery] = useState('')
  const [selectedAttendees, setSelectedAttendees] = useState<AttendeeCandidate[]>([])
  const [duplicateMessage, setDuplicateMessage] = useState('')
  const queryClient = useQueryClient()
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: '',
      date: '',
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      type: 'PERSONAL',
      visibility: 'PRIVATE',
      colorLabel: 'BLUE',
      location: '',
      content: '',
      creatorAttends: false,
      participantIds: [],
      userTargetIds: [],
      teamTargetIds: [],
      projectTargetIds: [],
    },
  })
  const scheduleType = useWatch({ control: form.control, name: 'type' })
  const creatorAttends = useWatch({ control: form.control, name: 'creatorAttends' })
  const allDay = useWatch({ control: form.control, name: 'allDay' })
  const { isDirty } = form.formState
  const attendeeSearch = useQuery({
    queryKey: ['schedule', 'attendee-candidates', attendeeQuery.trim()],
    queryFn: () => searchAttendees(attendeeQuery.trim()),
    enabled: attendeeQuery.trim().length > 0,
    retry: false,
  })
  const mutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: async (_result, request) => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const [scope, from, to] = query.queryKey
          return (
            scope === 'schedules' &&
            typeof from === 'string' &&
            typeof to === 'string' &&
            from <= request.startAt &&
            request.startAt < to
          )
        },
      })
      close()
    },
    onError: (error) => {
      if (error instanceof ScheduleApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors ?? {})) {
          form.setError(field as keyof ScheduleFormValues, { message })
        }
      }
    },
  })

  useEffect(() => {
    form.setValue('visibility', scheduleTypeDefaults[scheduleType], { shouldValidate: true })
    form.setValue('teamTargetIds', [])
    form.setValue('projectTargetIds', [])
  }, [form, scheduleType])

  function close() {
    queryClient.removeQueries({ queryKey: ['schedule', 'attendee-candidates'] })
    lastFocusedElement.current?.focus()
    onClose()
  }

  function requestClose() {
    if (mutation.isPending) {
      return
    }
    if (isDirty) {
      setDirtyCloseConfirmation(true)
      return
    }
    close()
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      requestClose()
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  function addAttendee(candidate: AttendeeCandidate) {
    if (selectedAttendees.some((attendee) => attendee.userId === candidate.userId)) {
      setDuplicateMessage('이미 선택된 참석자입니다.')
      return
    }
    const attendees = [...selectedAttendees, candidate]
    setSelectedAttendees(attendees)
    form.setValue(
      'participantIds',
      attendees.map(({ userId }) => userId),
      { shouldDirty: true },
    )
    setDuplicateMessage('')
  }

  function submit(values: ScheduleFormValues) {
    mutation.mutate(toScheduleRequest(values))
  }

  const totalAttendees = selectedAttendees.length + (creatorAttends ? 1 : 0)
  const canShowResults = attendeeQuery.trim().length > 0 && !attendeeSearch.isLoading
  const attendeeSearchMessage =
    attendeeSearch.error instanceof ScheduleApiError &&
    (attendeeSearch.error.status === 401 || attendeeSearch.error.status === 403)
      ? '참석자 검색 권한이 없습니다.'
      : '참석자 검색에 실패했습니다. 다시 시도해 주세요.'

  return (
    <div
      aria-labelledby="schedule-create-title"
      aria-modal="true"
      className="fixed inset-0 z-10 overflow-auto bg-slate-950/55 p-4"
      data-testid="schedule-create-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
    >
      <section
        className="mx-auto my-0 w-full max-w-2xl rounded-xl bg-surface p-4 shadow-2xl sm:my-8 sm:p-6"
        data-testid="schedule-create-panel"
      >
        <header className="flex items-center justify-between gap-4">
          <h1 className="m-0 text-xl font-bold text-text-primary" id="schedule-create-title">
            일정 추가
          </h1>
          <button
            aria-label="일정 추가 닫기"
            className={secondaryButtonClass}
            onClick={requestClose}
            type="button"
          >
            닫기
          </button>
        </header>
        <form
          className="mt-4 grid gap-3"
          noValidate
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
        >
          <label className={labelClass} htmlFor="schedule-title">
            제목
          </label>
          <input
            aria-describedby={form.formState.errors.title ? 'schedule-title-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.title)}
            autoFocus
            className={fieldClass}
            id="schedule-title"
            {...form.register('title')}
          />
          {form.formState.errors.title && (
            <p id="schedule-title-error" role="alert">
              {form.formState.errors.title.message}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3" data-testid="schedule-create-form-grid">
            <label className={labelClass}>
              날짜
              <input
                aria-describedby={form.formState.errors.date ? 'schedule-date-error' : undefined}
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
            <p id="schedule-date-error" role="alert">
              {form.formState.errors.date.message}
            </p>
          )}
          {form.formState.errors.endTime && (
            <p role="alert">{form.formState.errors.endTime.message}</p>
          )}
          <label className={labelClass}>
            <input type="checkbox" {...form.register('allDay')} />
            하루종일
          </label>
          <label className={labelClass}>
            위치
            <input className={fieldClass} {...form.register('location')} />
          </label>
          <label className={labelClass}>
            일정 유형
            <select className={fieldClass} {...form.register('type')}>
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
          {scheduleType === 'TEAM' && (
            <label className={labelClass}>
              팀 대상 ID
              <input
                inputMode="numeric"
                className={fieldClass}
                onChange={(event) =>
                  form.setValue('teamTargetIds', parseIdList(event.target.value), {
                    shouldDirty: true,
                  })
                }
              />
            </label>
          )}
          {scheduleType === 'PROJECT' && (
            <label className={labelClass}>
              프로젝트 대상 ID
              <input
                inputMode="numeric"
                className={fieldClass}
                onChange={(event) =>
                  form.setValue('projectTargetIds', parseIdList(event.target.value), {
                    shouldDirty: true,
                  })
                }
              />
            </label>
          )}
          {form.formState.errors.teamTargetIds && (
            <p role="alert">{form.formState.errors.teamTargetIds.message}</p>
          )}
          {form.formState.errors.projectTargetIds && (
            <p role="alert">{form.formState.errors.projectTargetIds.message}</p>
          )}
          <label className={labelClass}>
            색상 라벨
            <select className={fieldClass} {...form.register('colorLabel')}>
              {(['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'] as const).map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            참석자 검색
            <input
              onChange={(event) => setAttendeeQuery(event.target.value)}
              className={fieldClass}
              value={attendeeQuery}
            />
          </label>
          {attendeeSearch.isLoading && <p>참석자를 검색하고 있습니다.</p>}
          {attendeeSearch.isError && <p role="alert">{attendeeSearchMessage}</p>}
          {canShowResults && attendeeSearch.data?.length === 0 && (
            <p>일치하는 참석자가 없습니다.</p>
          )}
          {attendeeSearch.data?.map((candidate) => (
            <button key={candidate.userId} onClick={() => addAttendee(candidate)} type="button">
              {candidate.displayName} 참석자로 추가
            </button>
          ))}
          {duplicateMessage && <p role="alert">{duplicateMessage}</p>}
          {selectedAttendees.length > 0 && (
            <ul aria-label="선택된 참석자">
              {selectedAttendees.map((attendee) => (
                <li key={attendee.userId}>{attendee.displayName}</li>
              ))}
            </ul>
          )}
          <p>자동 참석 인원: {totalAttendees}명</p>
          <label className={labelClass}>
            <input type="checkbox" {...form.register('creatorAttends')} />
            등록자도 참석
          </label>
          <label>
            상세 설명
            <textarea className={fieldClass} {...form.register('content')} />
          </label>
          {mutation.isError && (
            <p role="alert">
              {mutation.error instanceof Error
                ? mutation.error.message
                : '일정을 저장하지 못했습니다. 다시 시도해 주세요.'}
            </p>
          )}
          <footer className="flex flex-wrap items-center justify-end gap-3">
            <button className={secondaryButtonClass} onClick={requestClose} type="button">
              취소
            </button>
            <button
              className="rounded-lg bg-primary px-3 py-2 font-semibold text-white focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? '일정 저장 중' : '일정 저장'}
            </button>
          </footer>
        </form>
      </section>
      {dirtyCloseConfirmation && (
        <div
          aria-labelledby="discard-title"
          aria-modal="true"
          className="fixed inset-1/2 z-20 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-2xl"
          role="alertdialog"
        >
          <h2 id="discard-title">입력한 내용을 버릴까요?</h2>
          <p>저장하지 않은 입력은 사라집니다.</p>
          <button onClick={() => setDirtyCloseConfirmation(false)} type="button">
            계속 입력
          </button>
          <button onClick={close} type="button">
            입력 취소하고 닫기
          </button>
        </div>
      )}
    </div>
  )
}
