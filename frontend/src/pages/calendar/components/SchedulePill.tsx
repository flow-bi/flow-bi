import { formatScheduleTime, getScheduleTypeLabel } from '../lib/calendarUtils'

import type { CalendarSchedule } from '../types/calendar'

type SchedulePillProps = {
  compact?: boolean
  schedule: CalendarSchedule
  onSelect: (schedule: CalendarSchedule) => void
}

export function SchedulePill({ compact = false, onSelect, schedule }: SchedulePillProps) {
  return (
    <button
      className={`schedule-pill ${schedule.colorLabel.toLowerCase()} ${
        schedule.roomReservation ? 'room-linked' : ''
      } ${compact ? 'compact' : ''}`}
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onSelect(schedule)
      }}
    >
      <strong>{schedule.title}</strong>
      {!compact ? (
        <span>
          {schedule.isAllDay
            ? '하루 종일'
            : `${formatScheduleTime(schedule.startAt)} - ${formatScheduleTime(schedule.endAt)}`}
          {' · '}
          {schedule.roomReservation ? '회의실 예약' : getScheduleTypeLabel(schedule.scheduleType)}
        </span>
      ) : null}
    </button>
  )
}
