import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Modal } from '../../../../shared/components/Modal'
import { StatusBadge } from '../../../../shared/components/StatusBadge'
import {
  useCancelReservation,
  useCreateReservation,
  useRoomReservations,
  useUpdateReservation,
} from '../../list/hooks'
import { reservationFormSchema } from '../../list/schema'

import type { ReservationFormValues } from '../../list/schema'
import type { Reservation, Room } from '../../list/types'

type ReservationPanelProps = {
  rooms: Room[]
  initialRoom: Room | null
  date: string
  reservation: Reservation | null
  isOpen: boolean
  onClose: () => void
}

const timeOptions = Array.from(
  { length: 10 },
  (_, index) => `${String(index + 9).padStart(2, '0')}:00`,
)

export function ReservationPanel({
  rooms,
  initialRoom,
  date,
  reservation,
  isOpen,
  onClose,
}: ReservationPanelProps) {
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoom?.roomId ?? 0)
  const selectedRoom = rooms.find((room) => room.roomId === selectedRoomId) ?? initialRoom
  const createMutation = useCreateReservation(selectedRoomId)
  const updateMutation = useUpdateReservation(reservation?.reservationId ?? 0)
  const cancelMutation = useCancelReservation()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: getDefaultValues(date, reservation),
  })
  const selectedDate = useWatch({ control, name: 'date' }) || date
  const reservationsQuery = useRoomReservations(selectedRoomId || null, selectedDate)
  const reservations = reservationsQuery.data ?? selectedRoom?.reservations ?? []

  useEffect(() => {
    reset(getDefaultValues(date, reservation))
  }, [date, reservation, reset])

  const submit = (values: ReservationFormValues) => {
    if (!selectedRoom) {
      return
    }
    if (reservation) {
      updateMutation.mutate({ roomId: selectedRoomId, values }, { onSuccess: onClose })
      return
    }
    createMutation.mutate(values, { onSuccess: onClose })
  }

  const isPending = createMutation.isPending || updateMutation.isPending || cancelMutation.isPending
  const isError = createMutation.isError || updateMutation.isError || cancelMutation.isError

  return (
    <Modal title={reservation ? '예약 수정' : '예약하기'} isOpen={isOpen} onClose={onClose}>
      {selectedRoom ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            void handleSubmit(submit)(event)
          }}
        >
          <Field label="회의실">
            <select
              className="form-input"
              value={selectedRoomId}
              onChange={(event) => setSelectedRoomId(Number(event.target.value))}
            >
              {rooms.map((room) => (
                <option key={room.roomId} value={room.roomId}>
                  {room.roomName} · {room.capacity ?? '-'}명
                </option>
              ))}
            </select>
          </Field>

          <Field label="예약 제목" error={errors.title?.message}>
            <input className="form-input" {...register('title')} />
          </Field>

          <Field label="날짜" error={errors.date?.message}>
            <input className="form-input" type="date" {...register('date')} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="시작" error={errors.startTime?.message}>
              <select className="form-input" {...register('startTime')}>
                {timeOptions.slice(0, -1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="종료" error={errors.endTime?.message}>
              <select className="form-input" {...register('endTime')}>
                {timeOptions.slice(1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-md border border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">예약 현황</p>
            <div className="mt-3 space-y-2">
              {reservationsQuery.isPending ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  예약 시간을 확인하는 중입니다.
                </p>
              ) : null}
              {reservationsQuery.isError ? (
                <p className="text-sm text-[var(--color-danger)]">
                  예약 현황을 불러오지 못했습니다.
                </p>
              ) : null}
              {!reservationsQuery.isPending && !reservationsQuery.isError ? (
                reservations.length > 0 ? (
                  reservations.map((item) => (
                    <div
                      key={item.reservationId}
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] px-3 py-2"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-[var(--color-text)]">
                          {item.title}
                        </span>
                        <span className="block text-xs tabular-nums text-[var(--color-text-muted)]">
                          {item.startAt.slice(11, 16)}-{item.endAt.slice(11, 16)} ·{' '}
                          {item.teamName ?? '팀 미지정'}
                        </span>
                      </span>
                      <StatusBadge
                        tone={
                          item.status === 'RESERVED'
                            ? 'success'
                            : item.status === 'PENDING'
                              ? 'warning'
                              : 'muted'
                        }
                        label={
                          item.status === 'RESERVED'
                            ? '예약완료'
                            : item.status === 'PENDING'
                              ? '승인대기'
                              : '취소됨'
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    선택한 날짜에 예약이 없습니다.
                  </p>
                )
              ) : null}
            </div>
          </div>

          <Field label="예상 인원" error={errors.count?.message}>
            <input
              className="form-input"
              min={1}
              type="number"
              {...register('count', { valueAsNumber: true })}
            />
          </Field>

          <Field label="참석자 사용자 ID">
            <input
              className="form-input"
              placeholder="예: 2, 3, 4"
              {...register('attendeeUserIds')}
            />
          </Field>

          <Field label="상세 설명" error={errors.field?.message}>
            <textarea
              className="min-h-28 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              {...register('field')}
            />
          </Field>

          {isError ? (
            <p className="text-sm text-[var(--color-danger)]">
              이미 예약된 시간대이거나 입력값이 올바르지 않습니다.
            </p>
          ) : null}

          <div className="flex gap-2">
            {reservation ? (
              <button
                className="h-10 rounded-md border border-[var(--color-danger)] px-4 text-sm font-semibold text-[var(--color-danger)] disabled:opacity-60"
                disabled={isPending}
                type="button"
                onClick={() =>
                  cancelMutation.mutate(reservation.reservationId, { onSuccess: onClose })
                }
              >
                예약 취소
              </button>
            ) : null}
            <button
              className="h-10 flex-1 rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {reservation ? '변경사항 저장' : '예약 완료'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">회의실을 선택해주세요.</p>
      )}
    </Modal>
  )
}

function getDefaultValues(date: string, reservation: Reservation | null): ReservationFormValues {
  return {
    title: reservation?.title ?? '',
    date: reservation?.startAt.slice(0, 10) ?? date,
    startTime: reservation?.startAt.slice(11, 16) ?? '09:00',
    endTime: reservation?.endAt.slice(11, 16) ?? '10:00',
    count: reservation?.count ?? 1,
    field: reservation?.field ?? '',
    attendeeUserIds: '',
  }
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
      {children}
      {error ? <span className="block text-sm text-[var(--color-danger)]">{error}</span> : null}
    </label>
  )
}
