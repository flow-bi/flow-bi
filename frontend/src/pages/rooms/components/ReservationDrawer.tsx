import { useMemo, useState } from 'react'

import type {
  ReservationFormErrors,
  ReservationFormValues,
  Room,
  RoomAttendee,
} from '../types/rooms'

type ReservationDrawerProps = {
  attendees: RoomAttendee[]
  errors: ReservationFormErrors
  formValues: ReservationFormValues
  room: Room | null
  onClose: () => void
  onSubmit: () => void
  onValuesChange: (values: ReservationFormValues) => void
}

const emptyAttendees: RoomAttendee[] = []

export function ReservationDrawer({
  attendees,
  errors,
  formValues,
  onClose,
  onSubmit,
  onValuesChange,
  room,
}: ReservationDrawerProps) {
  const [attendeeQuery, setAttendeeQuery] = useState('')
  const selectedAttendees = formValues.attendees ?? emptyAttendees
  const attendeeSuggestions = useMemo(() => {
    const query = attendeeQuery.trim()

    if (query.length === 0) {
      return []
    }

    return attendees
      .filter((attendee) => attendee.name.startsWith(query))
      .filter(
        (attendee) =>
          !selectedAttendees.some(
            (selectedAttendee) => selectedAttendee.userId === attendee.userId,
          ),
      )
  }, [attendeeQuery, attendees, selectedAttendees])

  if (!room) {
    return null
  }

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="reservation-drawer"
        aria-labelledby="reservation-drawer-title"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div className="panel-header">
          <div>
            <p className="section-label">Reservation</p>
            <h2 id="reservation-drawer-title">{room.roomName} 예약</h2>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="reservation-room-summary">
          <strong>{room.location}</strong>
          <p>
            최대 {room.capacity}명 · {room.equipment.join(', ')}
          </p>
        </div>

        <form className="reservation-form">
          <label className="field">
            <span>예약 제목</span>
            <input
              placeholder="예: 프로젝트 리뷰"
              value={formValues.title}
              onChange={(event) => {
                onValuesChange({ ...formValues, title: event.target.value })
              }}
            />
            {errors.title ? <small>{errors.title}</small> : null}
          </label>

          <label className="field">
            <span>날짜</span>
            <input
              type="date"
              value={formValues.date}
              onChange={(event) => {
                onValuesChange({ ...formValues, date: event.target.value })
              }}
            />
            {errors.date ? <small>{errors.date}</small> : null}
          </label>

          <div className="form-two-column">
            <label className="field">
              <span>시작 시간</span>
              <input
                type="time"
                value={formValues.startTime}
                onChange={(event) => {
                  onValuesChange({ ...formValues, startTime: event.target.value })
                }}
              />
              {errors.startTime ? <small>{errors.startTime}</small> : null}
            </label>

            <label className="field">
              <span>종료 시간</span>
              <input
                type="time"
                value={formValues.endTime}
                onChange={(event) => {
                  onValuesChange({ ...formValues, endTime: event.target.value })
                }}
              />
              {errors.endTime ? <small>{errors.endTime}</small> : null}
            </label>
          </div>

          <div className="field">
            <span>예약 인원</span>
            <div className="selection-preview attendee-count-preview">
              참석자 {selectedAttendees.length}명
            </div>
            {errors.count ? <small>{errors.count}</small> : null}
          </div>

          <div className="field attendee-search-field">
            <span>참석자</span>
            <input
              placeholder="이름 검색"
              value={attendeeQuery}
              onChange={(event) => {
                setAttendeeQuery(event.target.value)
              }}
            />
            {selectedAttendees.length > 0 ? (
              <div className="attendee-chip-list" aria-label="선택한 참석자">
                {selectedAttendees.map((attendee) => (
                  <button
                    className="attendee-chip"
                    key={attendee.userId}
                    type="button"
                    onClick={() => {
                      onValuesChange({
                        ...formValues,
                        count: String(selectedAttendees.length - 1),
                        attendees: selectedAttendees.filter(
                          (selectedAttendee) => selectedAttendee.userId !== attendee.userId,
                        ),
                      })
                    }}
                  >
                    {attendee.name}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            ) : null}
            {attendeeQuery.trim().length > 0 ? (
              <div className="attendee-suggestion-list">
                {attendeeSuggestions.length > 0 ? (
                  attendeeSuggestions.map((attendee) => (
                    <button
                      className="attendee-suggestion"
                      key={attendee.userId}
                      type="button"
                      onClick={() => {
                        onValuesChange({
                          ...formValues,
                          count: String(selectedAttendees.length + 1),
                          attendees: [...selectedAttendees, attendee],
                        })
                        setAttendeeQuery('')
                      }}
                    >
                      <strong>{attendee.name}</strong>
                      <span>
                        {attendee.teamName} · {attendee.position}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="attendee-suggestion-empty">검색 결과가 없습니다.</div>
                )}
              </div>
            ) : null}
          </div>

          {errors.roomId ? <div className="form-error">{errors.roomId}</div> : null}

          <button className="primary-button" type="button" onClick={onSubmit}>
            예약하기
          </button>
        </form>
      </aside>
    </div>
  )
}
