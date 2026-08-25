import { useEffect, useRef } from 'react'

import { formatScheduleTimeRange } from '../../model/calendarDate'
import {
  controlButtonClass,
  modalCloseButtonClass,
  typeLabel,
} from '../../model/calendarPresentation'

import type { ScheduleDetail } from '../../api/scheduleCalendarApi'

export function ScheduleDetailModal({
  detail,
  error,
  hasConfirmation,
  onClose,
  onEdit,
  onCancel,
}: {
  detail: ScheduleDetail
  error: string | null
  hasConfirmation: boolean
  onClose: () => void
  onEdit: () => void
  onCancel: (trigger: HTMLButtonElement) => void
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
  return (
    <div
      aria-labelledby="schedule-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-10 grid place-items-center bg-slate-950/55 p-4"
      data-testid="schedule-detail-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
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
        {detail.meetingRoomManaged && <p>회의실 예약에서 관리하는 일정입니다.</p>}
        {error && <p role="alert">{error}</p>}
        {detail.canManage && !detail.meetingRoomManaged && (
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
