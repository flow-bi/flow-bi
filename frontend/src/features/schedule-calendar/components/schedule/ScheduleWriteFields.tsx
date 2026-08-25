import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'

import { AttendeeSelector } from './AttendeeSelector'
import {
  type AttendeeCandidate,
  type ScheduleTargetOption,
  type ScheduleTargetOptions,
  type ScheduleType,
} from '../../api/scheduleCalendarApi'
import { scheduleTypeDefaults, type ScheduleFormValues } from '../../model/scheduleForm'

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-background'
const labelClass = 'grid gap-1.5 font-semibold text-text-primary'
const checkboxLabelClass = 'flex items-center gap-2 font-semibold text-text-primary'
const checkboxClass = 'h-4 w-4 shrink-0 accent-primary'
const secondaryButtonClass =
  'rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-text-primary hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'

type ScheduleWriteFieldsProps = {
  form: UseFormReturn<ScheduleFormValues>
  getTargetOptions: () => Promise<ScheduleTargetOptions>
  idPrefix: 'schedule' | 'schedule-edit'
  searchAttendees: (query: string) => Promise<AttendeeCandidate[]>
  selectedAttendees: AttendeeCandidate[]
  setSelectedAttendees: (attendees: AttendeeCandidate[]) => void
}

function typeLabel(type: ScheduleType): string {
  return { PERSONAL: '개인', TEAM: '팀', PROJECT: '프로젝트' }[type]
}

export function ScheduleWriteFields({
  form,
  getTargetOptions,
  idPrefix,
  searchAttendees,
  selectedAttendees,
  setSelectedAttendees,
}: ScheduleWriteFieldsProps) {
  const titleId = idPrefix === 'schedule' ? 'schedule-title' : 'schedule-edit-title-input'
  const scheduleType = useWatch({ control: form.control, name: 'type' })
  const creatorAttends = useWatch({ control: form.control, name: 'creatorAttends' })
  const allDay = useWatch({ control: form.control, name: 'allDay' })
  const teamTargetIds = useWatch({ control: form.control, name: 'teamTargetIds' })
  const projectTargetIds = useWatch({ control: form.control, name: 'projectTargetIds' })
  const [personalRelationNotice, setPersonalRelationNotice] = useState('')
  const targetOptions = useQuery({
    queryKey: ['schedule', 'target-options'],
    queryFn: getTargetOptions,
    enabled: scheduleType === 'TEAM' || scheduleType === 'PROJECT',
    retry: false,
  })

  useEffect(() => {
    form.setValue('visibility', scheduleTypeDefaults[scheduleType], { shouldValidate: true })
  }, [form, scheduleType])

  const handleScheduleTypeChange = (nextType: ScheduleType) => {
    if (nextType !== scheduleType) {
      form.setValue('teamTargetIds', [], { shouldDirty: teamTargetIds.length > 0 })
      form.setValue('projectTargetIds', [], { shouldDirty: projectTargetIds.length > 0 })
    }
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
  const changeAttendees = (attendees: AttendeeCandidate[]) => {
    setSelectedAttendees(attendees)
    form.setValue(
      'participantIds',
      attendees.map(({ userId }) => userId),
      { shouldDirty: true },
    )
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
  const targetErrorId = `${idPrefix}-${scheduleType === 'TEAM' ? 'team' : 'project'}-targets-error`
  const targetError = form.formState.errors[targetField]

  return (
    <>
      <label className={labelClass} htmlFor={titleId}>
        제목
      </label>
      <input
        aria-describedby={form.formState.errors.title ? `${idPrefix}-title-error` : undefined}
        aria-invalid={Boolean(form.formState.errors.title)}
        autoFocus={idPrefix === 'schedule'}
        className={fieldClass}
        id={titleId}
        {...form.register('title')}
      />
      {form.formState.errors.title && (
        <p id={`${idPrefix}-title-error`} role="alert">
          {form.formState.errors.title.message}
        </p>
      )}
      <div
        className="grid gap-3 sm:grid-cols-3"
        data-testid={`${idPrefix === 'schedule' ? 'schedule-create' : idPrefix}-form-grid`}
      >
        <label className={labelClass}>
          날짜
          <input
            aria-describedby={form.formState.errors.date ? `${idPrefix}-date-error` : undefined}
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
        <p id={`${idPrefix}-date-error`} role="alert">
          {form.formState.errors.date.message}
        </p>
      )}
      {form.formState.errors.endTime && <p role="alert">{form.formState.errors.endTime.message}</p>}
      <label className={checkboxLabelClass} data-testid={`${idPrefix}-all-day-field`}>
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
          <option value={scheduleTypeDefaults[scheduleType]}>{typeLabel(scheduleType)} 공개</option>
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
      <label className={checkboxLabelClass} data-testid={`${idPrefix}-creator-attends-field`}>
        <input className={checkboxClass} type="checkbox" {...form.register('creatorAttends')} />
        등록자도 참석
      </label>
      <label className={labelClass}>
        상세 설명
        <textarea className={fieldClass} {...form.register('content')} />
      </label>
    </>
  )
}
