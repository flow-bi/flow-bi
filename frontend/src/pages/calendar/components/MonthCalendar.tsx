import { SchedulePill } from './SchedulePill'
import { calendarWeekLabels } from '../constants/calendarOptions'
import { filterSchedulesByDate } from '../lib/calendarUtils'

import type { CalendarSchedule, MonthCell } from '../types/calendar'

type MonthCalendarProps = {
  monthCells: MonthCell[]
  schedules: CalendarSchedule[]
  selectedDate: string
  onAddSchedule: (date: string) => void
  onDateSelect: (date: string) => void
  onScheduleSelect: (schedule: CalendarSchedule) => void
}

export function MonthCalendar({
  monthCells,
  onAddSchedule,
  onDateSelect,
  onScheduleSelect,
  schedules,
  selectedDate,
}: MonthCalendarProps) {
  return (
    <article className="panel calendar-board-panel">
      <div className="calendar-grid enhanced">
        {calendarWeekLabels.map((day) => (
          <div className="calendar-head" key={day}>
            {day}
          </div>
        ))}
        {monthCells.map((cell) => {
          const daySchedules = filterSchedulesByDate(schedules, cell.date).slice(0, 3)
          const hiddenScheduleCount =
            filterSchedulesByDate(schedules, cell.date).length - daySchedules.length

          return (
            <div
              className={[
                'calendar-day',
                cell.date === selectedDate ? 'selected' : '',
                cell.inCurrentMonth ? '' : 'muted',
              ].join(' ')}
              key={cell.date}
              role="button"
              tabIndex={0}
              onClick={() => {
                onDateSelect(cell.date)
              }}
              onDoubleClick={() => {
                onAddSchedule(cell.date)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onDateSelect(cell.date)
                }
              }}
            >
              <strong>{cell.day}</strong>
              <div className="calendar-day-schedules">
                {daySchedules.map((schedule) => (
                  <SchedulePill
                    compact
                    key={schedule.scheduleId}
                    schedule={schedule}
                    onSelect={onScheduleSelect}
                  />
                ))}
                {hiddenScheduleCount > 0 ? (
                  <span className="calendar-more-count">+{hiddenScheduleCount}</span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
