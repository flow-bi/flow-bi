import { CheckCircle, X } from 'lucide-react'

import { BRAND_PRIMARY } from '@/constants/brand'

import type { BookingFormActions, BookingFormState, MeetingRoom } from '../types/meetingRooms'

interface BookingModalProps {
  room: MeetingRoom
  formState: BookingFormState
  formActions: BookingFormActions
  isSuccess: boolean
}

export function BookingModal({ room, formState, formActions, isSuccess }: BookingModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {isSuccess ? (
          <BookingSuccess room={room} formState={formState} />
        ) : (
          <>
            <BookingModalHeader room={room} onClose={formActions.onClose} />
            <BookingFormFields formState={formState} formActions={formActions} />
            <BookingModalActions onClose={formActions.onClose} onSubmit={formActions.onSubmit} />
          </>
        )}
      </div>
    </div>
  )
}

interface BookingSuccessProps {
  room: MeetingRoom
  formState: BookingFormState
}

function BookingSuccess({ room, formState }: BookingSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <p className="font-bold text-base text-foreground">예약이 완료되었습니다!</p>
      <p className="text-sm text-muted-foreground mt-1">
        {room.name} · {formState.date} · {formState.start} – {formState.end}
      </p>
    </div>
  )
}

interface BookingModalHeaderProps {
  room: MeetingRoom
  onClose: () => void
}

function BookingModalHeader({ room, onClose }: BookingModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-border">
      <div>
        <h3 className="font-bold text-base text-foreground">회의실 예약</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {room.name} · {room.location} · {room.capacity}인
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

interface BookingFormFieldsProps {
  formState: BookingFormState
  formActions: BookingFormActions
}

function BookingFormFields({ formState, formActions }: BookingFormFieldsProps) {
  return (
    <div className="px-6 py-5 space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1.5">날짜</label>
        <input
          type="date"
          value={formState.date}
          onChange={(event) => formActions.setDate(event.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold mb-1.5">시작 시간</label>
          <input
            type="time"
            value={formState.start}
            onChange={(event) => formActions.setStart(event.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">종료 시간</label>
          <input
            type="time"
            value={formState.end}
            onChange={(event) => formActions.setEnd(event.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1.5">사용 목적</label>
        <input
          type="text"
          value={formState.purpose}
          onChange={(event) => formActions.setPurpose(event.target.value)}
          placeholder="사용 목적 입력 (예: 팀 주간 회의)"
          className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
        />
      </div>
    </div>
  )
}

interface BookingModalActionsProps {
  onClose: () => void
  onSubmit: () => void
}

function BookingModalActions({ onClose, onSubmit }: BookingModalActionsProps) {
  return (
    <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
      >
        취소
      </button>
      <button
        onClick={onSubmit}
        className="px-4 py-2 rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        예약 확정
      </button>
    </div>
  )
}
