import { useEffect, useRef, useState, type FormEvent } from 'react'

import { AttendeeSelector } from './attendee-selector'
import {
  isMeetingRoomGatewayError,
  type CreateRoomReservationCommand,
  type RoomReservationAttendee,
} from './meeting-room-gateway'
import { TIME_INPUT_STEP_SECONDS } from './meeting-time'
import {
  toReservationCommand,
  validateReservationForm,
  type ReservationFormErrors,
  type ReservationFormValues,
} from './reservation-form-schema'

interface ReservationFormProps {
  roomId: number
  capacity: number
  mode: 'create' | 'update'
  initialValues: ReservationFormValues
  isSubmissionAvailable: boolean
  onSubmit: (command: CreateRoomReservationCommand) => Promise<void>
  onRefreshAvailability: () => void
  onFindAttendeeCandidates?: (query: string) => Promise<RoomReservationAttendee[]>
  onDirtyChange: (isDirty: boolean) => void
}

const inputClassName = 'mt-1 w-full rounded border border-(--color-border) p-2'

function messageFor(error: unknown, mode: ReservationFormProps['mode']): string {
  const code = isMeetingRoomGatewayError(error) ? error.code : undefined
  if (code === 'ROOM_RESERVATION_CONFLICT') {
    return '이미 예약된 시간입니다. 다른 시간대를 선택한 뒤 다시 시도해 주세요.'
  }
  if (code === 'ROOM_CAPACITY_EXCEEDED') {
    return '참석자 수가 회의실 수용 인원을 초과했습니다.'
  }
  if (code === 'RESERVATION_PARTICIPANT_FORBIDDEN') {
    return '추가할 수 없는 참석자가 포함되어 있습니다.'
  }
  if (code === 'AUTH_INTEGRATION_PENDING') {
    return '인증 연동이 준비 중이어서 예약을 제출할 수 없습니다.'
  }
  return mode === 'update'
    ? '예약을 수정하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.'
    : '예약을 생성하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.'
}

export function ReservationForm({
  roomId,
  capacity,
  mode,
  initialValues,
  isSubmissionAvailable,
  onSubmit,
  onRefreshAvailability,
  onFindAttendeeCandidates,
  onDirtyChange,
}: ReservationFormProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<ReservationFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAttendeeSearching, setIsAttendeeSearching] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const [isSuccess, setIsSuccess] = useState(false)
  const initialValuesKey = JSON.stringify(initialValues)
  const previousUpdateInitialValuesKeyRef = useRef(initialValuesKey)
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues)

  useEffect(() => {
    if (mode !== 'update' || previousUpdateInitialValuesKeyRef.current === initialValuesKey) {
      return
    }
    previousUpdateInitialValuesKeyRef.current = initialValuesKey
    setValues(initialValues)
    setErrors({})
    setSubmitError(undefined)
    setIsSuccess(false)
  }, [initialValues, initialValuesKey, mode])

  useEffect(() => onDirtyChange(isDirty && !isSuccess), [isDirty, isSuccess, onDirtyChange])

  function updateAttendees(attendees: RoomReservationAttendee[]) {
    setValues({ ...values, attendeeIds: attendees.map(({ userId }) => userId), attendees })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || !isSubmissionAvailable || isAttendeeSearching) {
      return
    }
    const validationErrors = validateReservationForm(values, capacity)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }
    setSubmitError(undefined)
    setIsSubmitting(true)
    try {
      await onSubmit(toReservationCommand(roomId, values))
      setIsSuccess(true)
    } catch (error) {
      setSubmitError(messageFor(error, mode))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {!isSubmissionAvailable ? (
        <p className="mt-3 rounded border border-(--color-warning) p-3" role="status">
          인증 연동이 준비 중이어서 예약을 제출할 수 없습니다.
        </p>
      ) : null}
      {isSuccess ? (
        <p className="mt-3 rounded border border-(--color-success) p-3" role="status">
          {mode === 'update'
            ? '예약과 연결 일정이 수정되었습니다.'
            : '예약과 연결 일정이 생성되었습니다.'}
        </p>
      ) : null}
      {submitError ? (
        <div className="mt-3 rounded border border-(--color-danger) p-3" role="alert">
          <p>{submitError}</p>
          {submitError.startsWith('이미 예약된') ? (
            <button
              className="mt-2 rounded border border-(--color-border) px-3 py-1"
              type="button"
              onClick={onRefreshAvailability}
            >
              예약 현황 다시 조회
            </button>
          ) : null}
        </div>
      ) : null}
      <form className="mt-4 space-y-4" onSubmit={(event) => void submit(event)} noValidate>
        <label>
          예약 제목
          <input
            className={inputClassName}
            value={values.title}
            onChange={(event) => setValues({ ...values, title: event.target.value })}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'reservation-title-error' : undefined}
          />
        </label>
        {errors.title ? (
          <p id="reservation-title-error" role="alert">
            {errors.title}
          </p>
        ) : null}
        <label>
          날짜
          <input
            className={inputClassName}
            type="date"
            value={values.date}
            onChange={(event) => setValues({ ...values, date: event.target.value })}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? 'reservation-date-error' : undefined}
          />
        </label>
        {errors.date ? (
          <p id="reservation-date-error" role="alert">
            {errors.date}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <label>
            시작 시간
            <input
              className={inputClassName}
              type="time"
              min="09:00"
              max="18:00"
              step={TIME_INPUT_STEP_SECONDS}
              value={values.startTime}
              onChange={(event) => setValues({ ...values, startTime: event.target.value })}
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={errors.startTime ? 'reservation-start-time-error' : undefined}
            />
          </label>
          <label>
            종료 시간
            <input
              className={inputClassName}
              type="time"
              min="09:00"
              max="18:00"
              step={TIME_INPUT_STEP_SECONDS}
              value={values.endTime}
              onChange={(event) => setValues({ ...values, endTime: event.target.value })}
              aria-invalid={Boolean(errors.endTime)}
              aria-describedby={errors.endTime ? 'reservation-end-time-error' : undefined}
            />
          </label>
        </div>
        {errors.startTime ? (
          <p id="reservation-start-time-error" role="alert">
            {errors.startTime}
          </p>
        ) : null}
        {errors.endTime ? (
          <p id="reservation-end-time-error" role="alert">
            {errors.endTime}
          </p>
        ) : null}
        <label className="flex items-center gap-2">
          <input
            checked={values.creatorAttends}
            onChange={(event) => setValues({ ...values, creatorAttends: event.target.checked })}
            type="checkbox"
          />
          등록자도 참석
        </label>
        <AttendeeSelector
          selectedAttendees={values.attendees ?? []}
          onChange={updateAttendees}
          onFindCandidates={onFindAttendeeCandidates}
          describedBy={errors.attendeeIds ? 'reservation-attendees-error' : undefined}
          onSearchStateChange={setIsAttendeeSearching}
        />
        {errors.attendeeIds ? (
          <p id="reservation-attendees-error" role="alert">
            {errors.attendeeIds}
          </p>
        ) : null}
        <label>
          상세 설명
          <textarea
            className={inputClassName}
            rows={4}
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
          />
        </label>
        <button
          className="w-full rounded bg-(--color-primary) px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={!isSubmissionAvailable || isSubmitting}
        >
          {isSubmitting
            ? mode === 'update'
              ? '예약 및 일정 수정 중'
              : '예약 및 일정 생성 중'
            : mode === 'update'
              ? '예약 및 일정 수정'
              : '예약 및 일정 생성'}
        </button>
      </form>
    </>
  )
}
