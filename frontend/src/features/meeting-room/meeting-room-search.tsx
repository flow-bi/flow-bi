import { useState, type FormEvent } from 'react'

import { ROOM_AVAILABILITY_STATUSES, type RoomAvailabilityQuery } from './meeting-room-gateway'
import {
  toRoomAvailabilityQuery,
  type RoomAvailabilitySearchDraft as SearchForm,
} from './meeting-room-search-query'
import { TIME_INPUT_STEP_SECONDS, validateMeetingTimes } from './meeting-time'
import { ROOM_AVAILABILITY_STATUS_LABELS } from './room-availability-status'

type SearchFormErrors = Partial<Pick<SearchForm, 'startTime' | 'endTime'>>

function initialSearch(date: string): SearchForm {
  return { minimumCapacity: '', date, startTime: '09:00', endTime: '18:00', availabilityStatus: '' }
}

export function RoomAvailabilitySearch({
  initialDate,
  onApply,
}: {
  initialDate: string
  onApply: (query: RoomAvailabilityQuery) => void
}) {
  const [draft, setDraft] = useState<SearchForm>(() => initialSearch(initialDate))
  const [errors, setErrors] = useState<SearchFormErrors>({})

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validateMeetingTimes(draft.startTime, draft.endTime)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length === 0) {
      onApply(toRoomAvailabilityQuery(draft))
    }
  }

  return (
    <form
      className="mb-6 grid gap-3 rounded-xl bg-(--color-surface) p-4 shadow-sm sm:grid-cols-5"
      onSubmit={submit}
      noValidate
    >
      <label>
        수용 인원
        <input
          className="mt-1 w-full rounded border border-(--color-border) p-2"
          type="number"
          min="1"
          value={draft.minimumCapacity}
          onChange={(event) => setDraft({ ...draft, minimumCapacity: event.target.value })}
        />
      </label>
      <label>
        날짜
        <input
          className="mt-1 w-full rounded border border-(--color-border) p-2"
          type="date"
          required
          value={draft.date}
          onChange={(event) => setDraft({ ...draft, date: event.target.value })}
        />
      </label>
      <label>
        시작 시간
        <input
          className="mt-1 w-full rounded border border-(--color-border) p-2"
          type="time"
          min="09:00"
          max="18:00"
          step={TIME_INPUT_STEP_SECONDS}
          value={draft.startTime}
          onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
          aria-invalid={Boolean(errors.startTime)}
          aria-describedby={errors.startTime ? 'search-start-time-error' : undefined}
        />
      </label>
      {errors.startTime ? (
        <p id="search-start-time-error" role="alert">
          {errors.startTime}
        </p>
      ) : null}
      <label>
        종료 시간
        <input
          className="mt-1 w-full rounded border border-(--color-border) p-2"
          type="time"
          min="09:00"
          max="18:00"
          step={TIME_INPUT_STEP_SECONDS}
          value={draft.endTime}
          onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
          aria-invalid={Boolean(errors.endTime)}
          aria-describedby={errors.endTime ? 'search-end-time-error' : undefined}
        />
      </label>
      {errors.endTime ? (
        <p id="search-end-time-error" role="alert">
          {errors.endTime}
        </p>
      ) : null}
      <label>
        예약 상태
        <select
          className="mt-1 w-full rounded border border-(--color-border) p-2"
          value={draft.availabilityStatus}
          onChange={(event) =>
            setDraft({
              ...draft,
              availabilityStatus: event.target.value as SearchForm['availabilityStatus'],
            })
          }
        >
          <option value="">전체</option>
          {ROOM_AVAILABILITY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ROOM_AVAILABILITY_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <button
        className="rounded bg-(--color-primary) px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) sm:col-span-5"
        type="submit"
      >
        검색 적용
      </button>
    </form>
  )
}
