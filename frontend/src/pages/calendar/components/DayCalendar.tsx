import { SchedulePill } from './SchedulePill'
import { formatDisplayDate } from '../lib/calendarUtils'

import type { CalendarSchedule } from '../types/calendar'

type DayCalendarProps = {
  date: string
  schedules: CalendarSchedule[]
  onAddSchedule: (date: string) => void
  onScheduleSelect: (schedule: CalendarSchedule) => void
}

const dayHours = Array.from({ length: 10 }, (_, index) => index + 9)

export function DayCalendar({
  date,
  onAddSchedule,
  onScheduleSelect,
  schedules,
}: DayCalendarProps) {
  return (
    <article className="panel calendar-board-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Day</p>
          <h2>{formatDisplayDate(date)}</h2>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            onAddSchedule(date)
          }}
        >
          일정 추가
        </button>
      </div>
      <div className="day-calendar-list">
        {dayHours.map((hour) => {
          const hourSchedules = schedules.filter((schedule) =>
            schedule.startAt.slice(11, 13).startsWith(String(hour).padStart(2, '0')),
          )

          return (
            <div className="day-hour-row" key={hour}>
              <span>{String(hour).padStart(2, '0')}:00</span>
              <div>
                {hourSchedules.length > 0 ? (
                  hourSchedules.map((schedule) => (
                    <SchedulePill
                      key={schedule.scheduleId}
                      schedule={schedule}
                      onSelect={onScheduleSelect}
                    />
                  ))
                ) : (
                  <span className="day-hour-empty">비어 있음</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
