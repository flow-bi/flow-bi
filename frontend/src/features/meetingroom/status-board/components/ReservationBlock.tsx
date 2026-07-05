import type { Reservation } from '../../list/types'

type ReservationBlockProps = {
  reservation: Reservation
  onSelect: (reservation: Reservation) => void
}

const dayStartHour = 9
const dayEndHour = 18
const dayStartMinute = dayStartHour * 60
const totalMinutes = (dayEndHour - dayStartHour) * 60

export function ReservationBlock({ reservation, onSelect }: ReservationBlockProps) {
  const startMinute = parseTimeMinute(reservation.startAt)
  const endMinute = parseTimeMinute(reservation.endAt)
  const visibleStart = clamp(startMinute, dayStartMinute, dayEndHour * 60)
  const visibleEnd = clamp(endMinute, dayStartMinute, dayEndHour * 60)
  if (visibleEnd <= visibleStart) {
    return null
  }
  const left = ((visibleStart - dayStartMinute) / totalMinutes) * 100
  const width = ((visibleEnd - visibleStart) / totalMinutes) * 100
  const isCancelled = reservation.status === 'CANCELLED'

  return (
    <button
      className={`absolute top-3 h-11 overflow-hidden rounded-md px-2 text-left font-semibold ${
        isCancelled
          ? 'bg-[var(--color-disabled-bg)] text-[var(--color-text-muted)]'
          : 'bg-[var(--color-primary)] text-white'
      }`}
      style={{ left: `${left}%`, width: `${width}%` }}
      type="button"
      onClick={() => onSelect(reservation)}
    >
      <span className="block truncate text-sm">{reservation.title}</span>
      <span className="block truncate text-xs">
        {reservation.startAt.slice(11, 16)}-{reservation.endAt.slice(11, 16)}
      </span>
    </button>
  )
}

function parseTimeMinute(value: string) {
  const time = value.slice(11, 16)
  const [hour = '0', minute = '0'] = time.split(':')
  return Number(hour) * 60 + Number(minute)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
