import { formatReservationTime, getReservationStatusLabel } from '../lib/roomUtils'

import type { Room, RoomReservation, RoomSearchFilters } from '../types/rooms'

type ReservationOverviewProps = {
  filters: RoomSearchFilters
  rooms: Room[]
  onDateChange: (date: string) => void
}

const timelineStartHour = 9
const timelineEndHour = 18
const timelineStart = timelineStartHour * 60
const timelineEnd = timelineEndHour * 60
const timelineDuration = timelineEnd - timelineStart

function getMinutesFromDateTime(value: string) {
  const time = value.slice(11, 16)
  const [hours = '0', minutes = '0'] = time.split(':')

  return Number(hours) * 60 + Number(minutes)
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00+09:00`))
}

function shiftDate(date: string, dayDelta: number) {
  const [year = '0', month = '1', day = '1'] = date.split('-')
  const nextDate = new Date(Number(year), Number(month) - 1, Number(day) + dayDelta)
  const nextYear = nextDate.getFullYear()
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0')
  const nextDay = String(nextDate.getDate()).padStart(2, '0')

  return `${nextYear}-${nextMonth}-${nextDay}`
}

function getTimelineBlockStyle(reservation: RoomReservation) {
  const start = Math.max(getMinutesFromDateTime(reservation.startAt), timelineStart)
  const end = Math.min(getMinutesFromDateTime(reservation.endAt), timelineEnd)
  const left = ((start - timelineStart) / timelineDuration) * 100
  const width = Math.max(((end - start) / timelineDuration) * 100, 4)

  return {
    left: `${left}%`,
    width: `${width}%`,
  }
}

function getSearchWindowStyle(filters: RoomSearchFilters) {
  if (
    filters.startTime.length === 0 ||
    filters.endTime.length === 0 ||
    filters.startTime >= filters.endTime
  ) {
    return null
  }

  const [startHours = '0', startMinutes = '0'] = filters.startTime.split(':')
  const [endHours = '0', endMinutes = '0'] = filters.endTime.split(':')
  const start = Math.max(Number(startHours) * 60 + Number(startMinutes), timelineStart)
  const end = Math.min(Number(endHours) * 60 + Number(endMinutes), timelineEnd)

  if (end <= timelineStart || start >= timelineEnd) {
    return null
  }

  return {
    left: `${((start - timelineStart) / timelineDuration) * 100}%`,
    width: `${Math.max(((end - start) / timelineDuration) * 100, 3)}%`,
  }
}

export function ReservationOverview({ filters, onDateChange, rooms }: ReservationOverviewProps) {
  const roomRows = rooms.map((room) => ({
    ...room,
    reservations: room.reservations
      .filter((reservation) => reservation.startAt.startsWith(filters.date))
      .sort((first, second) => first.startAt.localeCompare(second.startAt)),
  }))
  const reservationCount = roomRows.reduce((total, room) => total + room.reservations.length, 0)
  const searchWindowStyle = getSearchWindowStyle(filters)
  const hours = Array.from(
    { length: timelineEndHour - timelineStartHour + 1 },
    (_, index) => timelineStartHour + index,
  )

  return (
    <section className="panel reservation-overview" aria-labelledby="reservation-overview-title">
      <div className="panel-header">
        <div>
          <p className="section-label">All Rooms</p>
          <h2 id="reservation-overview-title">전체 예약 현황</h2>
        </div>
        <div className="reservation-overview-actions">
          <div className="time-slot-carousel" aria-label="예약 현황 날짜 이동">
            <button
              type="button"
              aria-label="이전 날짜"
              onClick={() => {
                onDateChange(shiftDate(filters.date, -1))
              }}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <div>
              <strong>{formatDateLabel(filters.date)}</strong>
            </div>
            <button
              type="button"
              aria-label="다음 날짜"
              onClick={() => {
                onDateChange(shiftDate(filters.date, 1))
              }}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
          <span className="success-badge">{reservationCount}건</span>
        </div>
      </div>

      <div className="reservation-timeline">
        <div className="timeline-hours" aria-hidden="true">
          <span />
          {hours.map((hour) => (
            <span key={hour}>{hour}:00</span>
          ))}
        </div>
        <div className="room-timeline-list">
          {roomRows.map((room) => (
            <div className="room-timeline-row" key={room.roomId}>
              <div className="room-timeline-label">
                <strong>{room.roomName}</strong>
                <span>{room.location}</span>
              </div>
              <div className="timeline-track room-timeline-track">
                {searchWindowStyle ? (
                  <div className="timeline-search-window" style={searchWindowStyle}>
                    검색 시간대
                  </div>
                ) : null}
                {room.reservations.map((reservation) => (
                  <button
                    aria-label={`${room.roomName} ${reservation.title} 상세 정보`}
                    className={`timeline-reservation ${reservation.status.toLowerCase()}`}
                    key={reservation.reservationId}
                    style={getTimelineBlockStyle(reservation)}
                    type="button"
                  >
                    <strong>{formatReservationTime(reservation.startAt)}</strong>
                    <span>{getReservationStatusLabel(reservation.status)}</span>
                    <div className="reservation-popover" role="tooltip">
                      <div>
                        <strong>{reservation.title}</strong>
                        <span>{getReservationStatusLabel(reservation.status)}</span>
                      </div>
                      <dl>
                        <div>
                          <dt>회의실</dt>
                          <dd>{room.roomName}</dd>
                        </div>
                        <div>
                          <dt>시간</dt>
                          <dd>
                            {formatReservationTime(reservation.startAt)} -{' '}
                            {formatReservationTime(reservation.endAt)}
                          </dd>
                        </div>
                        <div>
                          <dt>팀</dt>
                          <dd>{reservation.teamName}</dd>
                        </div>
                        <div>
                          <dt>예약자</dt>
                          <dd>{reservation.organizerName}</dd>
                        </div>
                        <div>
                          <dt>인원</dt>
                          <dd>{reservation.count}명</dd>
                        </div>
                      </dl>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {reservationCount > 0 ? (
        <div className="reservation-chip-list">
          {roomRows.flatMap((room) =>
            room.reservations.map((reservation) => (
              <span
                className={`status-badge ${reservation.status.toLowerCase()}`}
                key={reservation.reservationId}
              >
                {room.roomName} · {formatReservationTime(reservation.startAt)} {reservation.title} ·{' '}
                {getReservationStatusLabel(reservation.status)}
              </span>
            )),
          )}
        </div>
      ) : (
        <div className="empty-state">선택한 조건에 표시할 예약 현황이 없습니다.</div>
      )}
    </section>
  )
}
