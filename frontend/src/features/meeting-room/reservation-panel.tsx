import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import {
  isMeetingRoomGatewayError,
  type CreateRoomReservationCommand,
  type RoomReservationAttendee,
  type RoomSummary,
} from './meeting-room-gateway'
import { TIME_INPUT_STEP_SECONDS } from './meeting-time'
import {
  initialReservationValuesFromSearch,
  toReservationCommand,
  validateReservationForm,
  type ReservationFormErrors,
  type ReservationFormValues,
} from './reservation-form-schema'

interface ReservationPanelProps {
  room: RoomSummary
  initialDate: string
  isSubmissionAvailable: boolean
  mode?: 'create' | 'update'
  initialValues?: ReservationFormValues
  panelTitle?: string
  onClose: () => void
  onSubmit: (command: CreateRoomReservationCommand) => Promise<void>
  onRefreshAvailability: () => void
  onFindAttendeeCandidates?: (query: string) => Promise<RoomReservationAttendee[]>
}

const inputClassName = 'mt-1 w-full rounded border border-(--color-border) p-2'
function messageFor(error: unknown): string {
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
  return '예약을 생성하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.'
}

export function ReservationPanel({
  room,
  initialDate,
  isSubmissionAvailable,
  mode = 'create',
  initialValues,
  panelTitle,
  onClose,
  onSubmit,
  onRefreshAvailability,
  onFindAttendeeCandidates,
}: ReservationPanelProps) {
  const defaultValues =
    initialValues ??
    initialReservationValuesFromSearch({ date: initialDate, startTime: '09:00', endTime: '10:00' })
  const [values, setValues] = useState(defaultValues)
  const [errors, setErrors] = useState<ReservationFormErrors>({})
  const [attendeeQuery, setAttendeeQuery] = useState('')
  const [selectedAttendees, setSelectedAttendees] = useState<RoomReservationAttendee[]>(
    defaultValues.attendees ?? [],
  )
  const [duplicateNotice, setDuplicateNotice] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const [isSuccess, setIsSuccess] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isDirty = JSON.stringify(values) !== JSON.stringify(defaultValues)
  const normalizedAttendeeQuery = attendeeQuery.trim().replace(/\s+/g, ' ')
  const attendeeSearch = useQuery({
    queryKey: ['meeting-room', 'attendee-candidates', normalizedAttendeeQuery],
    queryFn: () => onFindAttendeeCandidates?.(normalizedAttendeeQuery) ?? Promise.resolve([]),
    enabled: normalizedAttendeeQuery.length > 0,
    retry: false,
  })

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  function requestClose() {
    if (isSuccess) {
      onClose()
      return
    }
    if (isDirty) {
      setConfirmDiscard(true)
    } else {
      onClose()
    }
  }

  function addAttendee(candidate: RoomReservationAttendee) {
    if (selectedAttendees.some((attendee) => attendee.userId === candidate.userId)) {
      setDuplicateNotice(true)
    } else {
      const attendees = [...selectedAttendees, candidate]
      setSelectedAttendees(attendees)
      setValues({ ...values, attendeeIds: attendees.map(({ userId }) => userId), attendees })
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || !isSubmissionAvailable || attendeeSearch.isLoading) {
      return
    }
    const validationErrors = validateReservationForm(values, room.capacity)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }
    setSubmitError(undefined)
    setIsSubmitting(true)
    try {
      await onSubmit(toReservationCommand(room.id, values))
      setIsSuccess(true)
    } catch (error) {
      setSubmitError(messageFor(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-10 flex justify-end bg-black/30"
      role="presentation"
      data-testid="reservation-panel-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          requestClose()
        }
      }}
    >
      <section
        className="h-full w-full overflow-y-auto bg-(--color-surface) p-5 shadow-xl sm:max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-panel-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            ref={headingRef}
            id="reservation-panel-title"
            tabIndex={-1}
            className="text-2xl font-bold outline-none"
          >
            {mode === 'update' ? `${panelTitle ?? room.name} 예약 수정` : `${room.name} 예약`}
          </h2>
          <button
            type="button"
            className="rounded border border-(--color-border) px-3 py-1"
            onClick={requestClose}
          >
            닫기
          </button>
        </div>
        <p className="mt-2">
          수용 인원: {room.capacity}명 · {room.location}
        </p>
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
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            void submit(event)
          }}
          noValidate
        >
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
          <fieldset
            aria-describedby={errors.attendeeIds ? 'reservation-attendees-error' : undefined}
          >
            <legend>참석자</legend>
            <label>
              참석자 검색
              <input
                className={inputClassName}
                value={attendeeQuery}
                onChange={(event) => setAttendeeQuery(event.target.value)}
              />
            </label>
            {attendeeSearch.isLoading ? <p role="status">참석자를 검색하고 있습니다.</p> : null}
            {attendeeSearch.isError ? (
              <div role="alert">
                <p>
                  {isMeetingRoomGatewayError(attendeeSearch.error) &&
                  attendeeSearch.error.code === 'AUTH_INTEGRATION_PENDING'
                    ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
                    : isMeetingRoomGatewayError(attendeeSearch.error) &&
                        attendeeSearch.error.code === 'ATTENDEE_SEARCH_FORBIDDEN'
                      ? '참석자 검색 권한이 없습니다.'
                      : '참석자 검색에 실패했습니다. 다시 시도해 주세요.'}
                </p>
                <button type="button" onClick={() => void attendeeSearch.refetch()}>
                  검색 다시 시도
                </button>
              </div>
            ) : null}
            {normalizedAttendeeQuery.length > 0 &&
            !attendeeSearch.isLoading &&
            !attendeeSearch.isError &&
            attendeeSearch.data?.length === 0 ? (
              <p role="status">일치하는 참석자가 없습니다.</p>
            ) : null}
            {attendeeSearch.data?.map((candidate) => (
              <button
                key={candidate.userId}
                className="mt-2 mr-2 rounded border border-(--color-border) px-3 py-1"
                type="button"
                onClick={() => addAttendee(candidate)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addAttendee(candidate)
                  }
                }}
              >
                {candidate.displayName} 참석자로 추가
              </button>
            ))}
            {duplicateNotice ? <p role="status">중복 참석자는 한 번만 추가됩니다.</p> : null}
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="추가된 참석자">
              {selectedAttendees.map((attendee) => (
                <li key={attendee.userId}>
                  <button
                    className="rounded bg-(--color-background) px-2 py-1"
                    type="button"
                    onClick={() => {
                      const attendees = selectedAttendees.filter(
                        ({ userId }) => userId !== attendee.userId,
                      )
                      setSelectedAttendees(attendees)
                      setValues({
                        ...values,
                        attendeeIds: attendees.map(({ userId }) => userId),
                        attendees,
                      })
                    }}
                  >
                    {attendee.displayName} 제거
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
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
        {confirmDiscard ? (
          <div
            className="mt-4 rounded border border-(--color-warning) p-3"
            role="alertdialog"
            aria-label="입력 내용 삭제 확인"
          >
            <p>저장하지 않은 입력 내용이 있습니다.</p>
            <button
              className="mt-2 rounded bg-(--color-danger) px-3 py-1 text-white"
              type="button"
              onClick={onClose}
            >
              입력 내용 삭제
            </button>
            <button
              className="ml-2 rounded border border-(--color-border) px-3 py-1"
              type="button"
              onClick={() => setConfirmDiscard(false)}
            >
              계속 입력
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
