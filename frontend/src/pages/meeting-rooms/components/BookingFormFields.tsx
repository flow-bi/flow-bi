import type { BookingFormActions, BookingFormState } from '../types/meetingRooms'

interface BookingFormFieldsProps {
  formState: BookingFormState
  formActions: BookingFormActions
}

export function BookingFormFields({ formState, formActions }: BookingFormFieldsProps) {
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
