import { ReservationTextList, ReservationTimetable } from './reservation-timetable'

import type { RoomSummary } from './meeting-room-gateway'

const defaultImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23e5e7eb'/%3E%3Cpath d='M70 130h180V80H70zM95 80V50h130v30' fill='%239ca3af'/%3E%3C/svg%3E"

type Reservation = RoomSummary['reservations'][number]

export function RoomAvailabilityList({
  rooms,
  onReserve,
  onEdit,
  onCancel,
}: {
  rooms: RoomSummary[]
  onReserve: (room: RoomSummary, trigger: HTMLButtonElement) => void
  onEdit: (room: RoomSummary, reservation: Reservation, trigger: HTMLButtonElement) => void
  onCancel: (room: RoomSummary, reservation: Reservation, trigger: HTMLButtonElement) => void
}) {
  return (
    <section className="space-y-4" aria-label="회의실 목록">
      {rooms.map((room) => (
        <article
          key={room.id}
          className="rounded-xl bg-(--color-surface) p-4 shadow-sm"
          aria-labelledby={`room-${room.id}`}
        >
          <div className="flex gap-4">
            <img
              className="h-24 w-36 rounded object-cover"
              src={defaultImage}
              alt={`${room.name} 기본 이미지`}
            />
            <div>
              <h2 id={`room-${room.id}`} className="text-xl font-bold">
                {room.name}
              </h2>
              <p>수용 인원: {room.capacity}명</p>
              <p>위치: {room.location}</p>
            </div>
          </div>
          <div className="mt-4">
            <ReservationTimetable reservations={room.reservations} />
            <div className="sm:hidden">
              <ReservationTextList reservations={room.reservations} />
            </div>
          </div>
          {room.reservations
            .filter((reservation) => reservation.canEdit)
            .map((reservation) => (
              <button
                key={reservation.id}
                className="mt-3 mr-3 rounded border border-(--color-border) px-4 py-2"
                type="button"
                aria-label={`예약 수정: ${reservation.title}`}
                onClick={(event) => onEdit(room, reservation, event.currentTarget)}
              >
                예약 수정
              </button>
            ))}
          {room.reservations
            .filter((reservation) => reservation.canEdit)
            .map((reservation) => (
              <button
                key={`cancel-${reservation.id}`}
                className="mt-3 mr-3 rounded border border-(--color-danger) px-4 py-2 text-(--color-danger)"
                type="button"
                aria-label={`예약 취소: ${reservation.title}`}
                onClick={(event) => onCancel(room, reservation, event.currentTarget)}
              >
                예약 취소
              </button>
            ))}
          <button
            id={`room-reserve-${room.id}`}
            className="mt-4 rounded bg-(--color-primary) px-4 py-2 text-white"
            type="button"
            onClick={(event) => onReserve(room, event.currentTarget)}
          >
            {room.name} 예약하기
          </button>
        </article>
      ))}
    </section>
  )
}
