import { RESERVATION_STATUS_LABELS } from './reservation-status'

import type { RoomReservationSummary } from './meeting-room-gateway'

const HOURS = Array.from({ length: 10 }, (_, index) => index + 9)

function formatTime(value: string): string {
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function ReservationTextList({ reservations }: { reservations: RoomReservationSummary[] }) {
  if (reservations.length === 0) {
    return <p>9:00–18:00 사이 예약이 없습니다.</p>
  }

  return (
    <ul className="space-y-2" aria-label="예약 텍스트 목록">
      {reservations.map((reservation) => (
        <li key={reservation.id} className="rounded border border-(--color-border) p-3">
          <strong>{reservation.title}</strong>
          <p>
            시간: {formatTime(reservation.startAt)}–{formatTime(reservation.endAt)}
          </p>
          <p>예약 팀: 제공되지 않음</p>
          <p>상태: {RESERVATION_STATUS_LABELS[reservation.displayStatus]}</p>
        </li>
      ))}
    </ul>
  )
}

export function ReservationTimetable({ reservations }: { reservations: RoomReservationSummary[] }) {
  return (
    <div className="hidden overflow-x-auto sm:block" aria-label="9시부터 18시까지 예약 시간표">
      <div className="grid min-w-180 grid-cols-10 text-xs text-(--color-text-secondary)">
        {HOURS.map((hour) => (
          <span key={hour} className="border-l border-(--color-border) px-1 py-2">
            {String(hour).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      <div className="relative mt-1 h-18 min-w-180 rounded border border-(--color-border) bg-(--color-background)">
        {reservations.map((reservation) => {
          const start = new Date(reservation.startAt)
          const end = new Date(reservation.endAt)
          const startMinutes = start.getHours() * 60 + start.getMinutes()
          const durationMinutes = Math.max(0, end.getTime() - start.getTime()) / 60000
          const left = ((startMinutes - 9 * 60) / (9 * 60)) * 100
          const width = (durationMinutes / (9 * 60)) * 100
          return (
            <div
              key={reservation.id}
              className="absolute top-2 overflow-hidden rounded bg-(--color-primary) px-2 py-1 text-xs text-white"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${reservation.title}, ${formatTime(reservation.startAt)}–${formatTime(reservation.endAt)}, ${RESERVATION_STATUS_LABELS[reservation.displayStatus]}`}
            >
              {reservation.title} · {RESERVATION_STATUS_LABELS[reservation.displayStatus]}
            </div>
          )
        })}
      </div>
    </div>
  )
}
