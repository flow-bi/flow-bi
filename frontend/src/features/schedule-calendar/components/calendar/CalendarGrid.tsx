import { ScheduleChip } from './CalendarDayTimeline'
import { calendarDays, formatCalendarHeading, type CalendarView } from '../../model/calendarDate'
import { koreanDate } from '../../model/calendarPresentation'

import type { ScheduleSummary } from '../../api/scheduleCalendarApi'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarGrid({
  view,
  date,
  schedules,
  onOpenSchedule,
  onSelectDate,
}: {
  view: Exclude<CalendarView, 'day'>
  date: string
  schedules: ScheduleSummary[]
  onOpenSchedule: (schedule: ScheduleSummary, trigger: HTMLButtonElement) => void
  onSelectDate: (date: string, trigger: HTMLButtonElement) => void
}) {
  return (
    <section
      aria-label={`${formatCalendarHeading(view, date)} 달력`}
      className="grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-border shadow-lg"
      data-testid="calendar-grid"
      role="grid"
    >
      {weekdays.map((weekday) => (
        <div
          className="bg-secondary px-2 py-2 text-center text-sm font-bold text-text-secondary"
          data-testid={`calendar-weekday-${weekday}`}
          key={weekday}
          role="columnheader"
        >
          {weekday}
        </div>
      ))}
      {calendarDays(view, date).map((day) => {
        const outsideMonth = view === 'month' && day.slice(0, 7) !== date.slice(0, 7)
        return (
          <article
            className={`min-h-20 min-w-0 bg-surface p-1 sm:min-h-28 sm:p-2 ${outsideMonth ? 'bg-background/60' : ''}`}
            key={day}
            role="gridcell"
          >
            {!outsideMonth && (
              <>
                <button
                  aria-label={`${koreanDate(day)} 일정 보기`}
                  className="rounded px-1 py-0.5 text-xs font-bold text-text-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-1 sm:text-sm"
                  data-calendar-day-button
                  onClick={(event) => onSelectDate(day, event.currentTarget)}
                  type="button"
                >
                  {Number(day.slice(-2))}
                </button>
                {schedules
                  .filter((schedule) => schedule.startAt.slice(0, 10) === day)
                  .map((schedule) => (
                    <ScheduleChip
                      key={schedule.id}
                      onOpen={onOpenSchedule}
                      schedule={schedule}
                      testId={`calendar-schedule-chip-${schedule.id}`}
                    />
                  ))}
              </>
            )}
          </article>
        )
      })}
    </section>
  )
}
