import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { type AttendeeCandidate, ScheduleApiError } from '../../api/scheduleCalendarApi'

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'
const actionClass =
  'rounded-md border border-border bg-surface px-3 py-1 text-sm font-semibold text-text-primary hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'

export interface AttendeeSelectorProps {
  searchAttendees: (query: string) => Promise<AttendeeCandidate[]>
  selected: AttendeeCandidate[]
  onChange: (attendees: AttendeeCandidate[]) => void
}

export function AttendeeSelector({ searchAttendees, selected, onChange }: AttendeeSelectorProps) {
  const [query, setQuery] = useState('')
  const [duplicateMessage, setDuplicateMessage] = useState('')
  const trimmedQuery = query.trim()
  const search = useQuery({
    queryKey: ['schedule', 'attendee-candidates', trimmedQuery],
    queryFn: () => searchAttendees(trimmedQuery),
    enabled: trimmedQuery.length > 0,
    retry: false,
  })
  const errorMessage =
    search.error instanceof ScheduleApiError &&
    (search.error.status === 401 || search.error.status === 403)
      ? '참석자 검색 권한이 없습니다.'
      : '참석자 검색에 실패했습니다. 다시 시도해 주세요.'

  const add = (candidate: AttendeeCandidate) => {
    if (selected.some((attendee) => attendee.userId === candidate.userId)) {
      setDuplicateMessage('이미 선택된 참석자입니다.')
      return
    }
    onChange([...selected, candidate])
    setDuplicateMessage('')
  }

  return (
    <fieldset className="grid min-w-0 gap-2 rounded-md border border-border p-3">
      <legend className="px-1 font-semibold text-text-primary">참석자</legend>
      <label className="grid gap-1.5 font-semibold text-text-primary">
        참석자 검색
        <input
          className={fieldClass}
          onChange={(event) => setQuery(event.target.value)}
          value={query}
        />
      </label>
      {search.isLoading && <p role="status">참석자를 검색하고 있습니다.</p>}
      {search.isError && <p role="alert">{errorMessage}</p>}
      {!search.isLoading &&
        !search.isError &&
        trimmedQuery.length > 0 &&
        search.data?.length === 0 && <p>일치하는 참석자가 없습니다.</p>}
      {search.data?.map((candidate) => (
        <button
          className={actionClass}
          key={candidate.userId}
          onClick={() => add(candidate)}
          type="button"
        >
          {candidate.displayName} 참석자로 추가
        </button>
      ))}
      {duplicateMessage && <p role="alert">{duplicateMessage}</p>}
      {selected.length > 0 && (
        <ul aria-label="선택된 참석자" className="grid gap-2">
          {selected.map((attendee) => (
            <li className="flex min-w-0 items-center justify-between gap-2" key={attendee.userId}>
              <span className="min-w-0 truncate">{attendee.displayName}</span>
              <button
                aria-label={`${attendee.displayName} 참석자 제거`}
                className={actionClass}
                onClick={() =>
                  onChange(selected.filter(({ userId }) => userId !== attendee.userId))
                }
                type="button"
              >
                제거
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
