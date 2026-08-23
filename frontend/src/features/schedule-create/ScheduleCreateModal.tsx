import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { AttendeeSelector } from './AttendeeSelector'
import {
  type AttendeeCandidate,
  type CreateScheduleRequest,
  type ScheduleTargetOption,
  type ScheduleTargetOptions,
  type ScheduleType,
  ScheduleApiError,
  createSchedule as createScheduleRequest,
  getScheduleTargetOptions as getScheduleTargetOptionsRequest,
  searchAttendees as searchAttendeesRequest,
} from './scheduleCreateApi'
import {
  scheduleFormSchema,
  scheduleTypeDefaults,
  toScheduleRequest,
  type ScheduleFormValues,
} from './scheduleForm'
import {
  ConfirmationDialog,
  confirmationDangerActionClass,
  confirmationSecondaryActionClass,
} from '../../shared/ui/ConfirmationDialog'

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-background'
const labelClass = 'grid gap-1.5 font-semibold text-text-primary'
const checkboxLabelClass = 'flex items-center gap-2 font-semibold text-text-primary'
const checkboxClass = 'h-4 w-4 shrink-0 accent-primary'
const secondaryButtonClass =
  'rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-text-primary hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'

export interface ScheduleCreateModalProps {
  onClose: () => void
  createSchedule?: (request: CreateScheduleRequest) => Promise<void>
  searchAttendees?: (query: string) => Promise<AttendeeCandidate[]>
  getTargetOptions?: () => Promise<ScheduleTargetOptions>
}

function typeLabel(type: ScheduleType): string {
  return { PERSONAL: '개인', TEAM: '팀', PROJECT: '프로젝트' }[type]
}

export function ScheduleCreateModal({
  onClose,
  createSchedule = createScheduleRequest,
  searchAttendees = searchAttendeesRequest,
  getTargetOptions = getScheduleTargetOptionsRequest,
}: ScheduleCreateModalProps) {
  const lastFocusedElement = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const [dirtyCloseConfirmation, setDirtyCloseConfirmation] = useState(false)
  const [selectedAttendees, setSelectedAttendees] = useState<AttendeeCandidate[]>([])
  const [personalRelationNotice, setPersonalRelationNotice] = useState('')
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
  const targetOptions = useQuery({
    queryKey: ['schedule', 'target-options'],
    queryFn: getTargetOptions,
    enabled: scheduleType === 'TEAM' || scheduleType === 'PROJECT',
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

  function handleScheduleTypeChange(nextType: ScheduleType) {
    if (nextType === 'PERSONAL' && scheduleType !== 'PERSONAL') {
      const hadRelations =
        form.getValues('participantIds').length > 0 || form.getValues('userTargetIds').length > 0
      setSelectedAttendees([])
      form.setValue('participantIds', [], { shouldDirty: hadRelations })
      form.setValue('userTargetIds', [], { shouldDirty: hadRelations })
      setPersonalRelationNotice(
        '개인 일정은 등록자 전용이므로 참석자와 사용자 공유 대상을 제거했습니다.',
      )
    }
  }

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

  function changeAttendees(attendees: AttendeeCandidate[]) {
    setSelectedAttendees(attendees)
    form.setValue(
      'participantIds',
      attendees.map(({ userId }) => userId),
      { shouldDirty: true },
    )
  }

  function submit(values: ScheduleFormValues) {
    mutation.mutate(toScheduleRequest(values))
  }

  function toggleTarget(targetField: 'teamTargetIds' | 'projectTargetIds', targetId: number) {
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
  const targetLabel = scheduleType === 'TEAM' ? '팀 대상' : '프로젝트 대상'
  const targetEmptyMessage =
    scheduleType === 'TEAM' ? '선택 가능한 팀이 없습니다.' : '선택 가능한 프로젝트가 없습니다.'
  const targetErrorId =
    scheduleType === 'TEAM' ? 'schedule-team-targets-error' : 'schedule-project-targets-error'
  const targetError = form.formState.errors[targetField]

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
          <label className={checkboxLabelClass} data-testid="schedule-all-day-field">
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
              {targetOptions.isLoading && <p>일정 대상 목록을 불러오고 있습니다.</p>}
              {targetOptions.isError && (
                <div className="grid gap-2" role="alert">
                  <p>일정 대상 목록을 불러오지 못했습니다. 다시 시도해 주세요.</p>
                  <button
                    className={secondaryButtonClass}
                    onClick={() => void targetOptions.refetch()}
                    type="button"
                  >
                    대상 목록 다시 시도
                  </button>
                </div>
              )}
              {!targetOptions.isLoading &&
                !targetOptions.isError &&
                targetOptionsForType.length === 0 && <p>{targetEmptyMessage}</p>}
              {!targetOptions.isLoading &&
                !targetOptions.isError &&
                targetOptionsForType.length > 0 && (
                  <div className="grid gap-2">
                    {targetOptionsForType.map((option) => {
                      const selected = form.getValues(targetField).includes(option.id)
                      return (
                        <label className={checkboxLabelClass} key={option.id}>
                          <input
                            checked={selected}
                            className={checkboxClass}
                            onChange={() => toggleTarget(targetField, option.id)}
                            type="checkbox"
                          />
                          {option.name}
                        </label>
                      )
                    })}
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
                  {color}
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
          <label className={checkboxLabelClass} data-testid="schedule-creator-attends-field">
            <input className={checkboxClass} type="checkbox" {...form.register('creatorAttends')} />
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
        <ConfirmationDialog
          description="저장하지 않은 입력은 사라집니다."
          footer={
            <>
              <button
                className={confirmationSecondaryActionClass}
                onClick={() => setDirtyCloseConfirmation(false)}
                type="button"
              >
                계속 입력
              </button>
              <button className={confirmationDangerActionClass} onClick={close} type="button">
                입력 취소하고 닫기
              </button>
            </>
          }
          onDismiss={() => setDirtyCloseConfirmation(false)}
          title="입력한 내용을 버릴까요?"
          titleId="discard-title"
        />
      )}
    </div>
  )
}
