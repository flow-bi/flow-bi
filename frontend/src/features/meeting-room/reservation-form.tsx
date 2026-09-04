import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { AttendeeSelector } from './attendee-selector'
import {
  isMeetingRoomGatewayError,
  type CreateRoomReservationCommand,
  type RoomReservationAttendee,
} from './meeting-room-gateway'
import { TIME_INPUT_STEP_SECONDS } from './meeting-time'
import {
  toReservationCommand,
  reservationFormSchema,
  type ReservationFormValues,
} from './reservation-form-schema'

interface ReservationFormProps {
  roomId: number
  capacity: number
  mode: 'create' | 'update'
  initialValues: ReservationFormValues
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
  onSubmit,
  onRefreshAvailability,
  onFindAttendeeCandidates,
  onDirtyChange,
}: ReservationFormProps) {
  const [isAttendeeSearching, setIsAttendeeSearching] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const [isSuccess, setIsSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema(capacity)),
    defaultValues: initialValues,
  })
  const attendees = useWatch({ control, name: 'attendees' })

  useEffect(() => onDirtyChange(isDirty && !isSuccess), [isDirty, isSuccess, onDirtyChange])

  function updateAttendees(attendees: RoomReservationAttendee[]) {
    setValue(
      'attendeeIds',
      attendees.map(({ userId }) => userId),
      { shouldDirty: true },
    )
    setValue('attendees', attendees, { shouldDirty: true })
  }

  async function submit(values: ReservationFormValues) {
    if (isAttendeeSearching) {
      return
    }
    setSubmitError(undefined)
    try {
      await onSubmit(toReservationCommand(roomId, values))
      setIsSuccess(true)
    } catch (error) {
      setSubmitError(messageFor(error, mode))
    }
  }

  return (
    <>
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
        onSubmit={(event) => void handleSubmit(submit)(event)}
        noValidate
      >
        <label>
          예약 제목
          <input
            className={inputClassName}
            {...register('title')}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'reservation-title-error' : undefined}
          />
        </label>
        {errors.title ? (
          <p id="reservation-title-error" role="alert">
            {errors.title.message}
          </p>
        ) : null}
        <label>
          날짜
          <input
            className={inputClassName}
            type="date"
            {...register('date')}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? 'reservation-date-error' : undefined}
          />
        </label>
        {errors.date ? (
          <p id="reservation-date-error" role="alert">
            {errors.date.message}
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
              {...register('startTime')}
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
              {...register('endTime')}
              aria-invalid={Boolean(errors.endTime)}
              aria-describedby={errors.endTime ? 'reservation-end-time-error' : undefined}
            />
          </label>
        </div>
        {errors.startTime ? (
          <p id="reservation-start-time-error" role="alert">
            {errors.startTime.message}
          </p>
        ) : null}
        {errors.endTime ? (
          <p id="reservation-end-time-error" role="alert">
            {errors.endTime.message}
          </p>
        ) : null}
        <label className="flex items-center gap-2">
          <input {...register('creatorAttends')} type="checkbox" />
          등록자도 참석
        </label>
        <AttendeeSelector
          selectedAttendees={attendees ?? []}
          onChange={updateAttendees}
          onFindCandidates={onFindAttendeeCandidates}
          describedBy={errors.attendeeIds ? 'reservation-attendees-error' : undefined}
          onSearchStateChange={setIsAttendeeSearching}
        />
        {errors.attendeeIds ? (
          <p id="reservation-attendees-error" role="alert">
            {errors.attendeeIds.message}
          </p>
        ) : null}
        <label>
          상세 설명
          <textarea className={inputClassName} rows={4} {...register('description')} />
        </label>
        <button
          className="w-full rounded bg-(--color-primary) px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
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
