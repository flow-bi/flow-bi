import { SchedulePill } from './SchedulePill'
import { filterSchedulesByDate } from '../lib/calendarUtils'

import type { CalendarSchedule, WeekDay } from '../types/calendar'

type WeekCalendarProps = {
  schedules: CalendarSchedule[]
  selectedDate: string
  weekDays: WeekDay[]
  onAddSchedule: (date: string) => void
  onDateSelect: (date: string) => void
  onScheduleSelect: (schedule: CalendarSchedule) => void
}

export function WeekCalendar({
  onAddSchedule,
  onDateSelect,
  onScheduleSelect,
  schedules,
  selectedDate,
  weekDays,
}: WeekCalendarProps) {
  return (
    <article className="panel calendar-board-panel">
      <div className="week-calendar-grid">
        {weekDays.map((day) => {
          const daySchedules = filterSchedulesByDate(schedules, day.date)

          return (
            <div
              className={day.date === selectedDate ? 'week-column active' : 'week-column'}
              key={day.date}
              role="button"
              tabIndex={0}
              onClick={() => {
                onDateSelect(day.date)
              }}
              onDoubleClick={() => {
                onAddSchedule(day.date)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onDateSelect(day.date)
                }
              }}
            >
              <span>{day.label}</span>
              <strong>{day.day}</strong>
              <div className="week-schedule-stack">
                {daySchedules.length > 0 ? (
                  daySchedules.map((schedule) => (
                    <SchedulePill
                      key={schedule.scheduleId}
                      schedule={schedule}
                      onSelect={onScheduleSelect}
                    />
                  ))
                ) : (
                  <span className="week-empty">일정 없음</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
