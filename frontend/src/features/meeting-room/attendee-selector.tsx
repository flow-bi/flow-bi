import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { isMeetingRoomGatewayError, type RoomReservationAttendee } from './meeting-room-gateway'

interface AttendeeSelectorProps {
  selectedAttendees: RoomReservationAttendee[]
  onChange: (attendees: RoomReservationAttendee[]) => void
  onFindCandidates?: (query: string) => Promise<RoomReservationAttendee[]>
  describedBy?: string
  onSearchStateChange?: (isSearching: boolean) => void
}

function normalizeAttendeeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ')
}

export function AttendeeSelector({
  selectedAttendees,
  onChange,
  onFindCandidates,
  describedBy,
  onSearchStateChange,
}: AttendeeSelectorProps) {
  const [attendeeQuery, setAttendeeQuery] = useState('')
  const [duplicateNotice, setDuplicateNotice] = useState(false)
  const normalizedAttendeeQuery = normalizeAttendeeQuery(attendeeQuery)
  const attendeeSearch = useQuery({
    queryKey: ['meeting-room', 'attendee-candidates', normalizedAttendeeQuery],
    queryFn: () => onFindCandidates?.(normalizedAttendeeQuery) ?? Promise.resolve([]),
    enabled: normalizedAttendeeQuery.length > 0,
    retry: false,
  })

  useEffect(() => {
    onSearchStateChange?.(attendeeSearch.isLoading)
  }, [attendeeSearch.isLoading, onSearchStateChange])

  function addAttendee(candidate: RoomReservationAttendee) {
    if (selectedAttendees.some((attendee) => attendee.userId === candidate.userId)) {
      setDuplicateNotice(true)
      return
    }
    onChange([...selectedAttendees, candidate])
  }

  return (
    <fieldset aria-describedby={describedBy}>
      <legend>참석자</legend>
      <label>
        참석자 검색
        <input
          className="mt-1 w-full rounded border border-(--color-border) p-2"
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
              onClick={() =>
                onChange(selectedAttendees.filter(({ userId }) => userId !== attendee.userId))
              }
            >
              {attendee.displayName} 제거
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
