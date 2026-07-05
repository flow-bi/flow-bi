import type { Reservation } from '../../list/types'

type ReservationBlockProps = {
  reservation: Reservation
  onSelect: (reservation: Reservation) => void
}

const dayStartHour = 9
const totalHours = 9

export function ReservationBlock({ reservation, onSelect }: ReservationBlockProps) {
  const start = new Date(reservation.startAt)
  const end = new Date(reservation.endAt)
  const left = Math.max(
    0,
    ((start.getHours() + start.getMinutes() / 60 - dayStartHour) / totalHours) * 100,
  )
  const width = Math.min(
    100 - left,
    Math.max(8, ((end.getTime() - start.getTime()) / 1000 / 60 / 60 / totalHours) * 100),
  )
  const isCancelled = reservation.status === 'CANCELLED'

  return (
    <button
      className={`absolute top-3 h-11 overflow-hidden rounded-md px-2 text-left text-xs font-semibold ${
        isCancelled
          ? 'bg-[var(--color-disabled-bg)] text-[var(--color-text-muted)]'
          : 'bg-[var(--color-primary)] text-white'
      }`}
      style={{ left: `${left}%`, width: `${width}%` }}
      type="button"
      onClick={() => onSelect(reservation)}
    >
      <span className="block truncate">{reservation.title}</span>
      <span className="block truncate font-normal">
        {reservation.startAt.slice(11, 16)}-{reservation.endAt.slice(11, 16)}
      </span>
    </button>
  )
}
