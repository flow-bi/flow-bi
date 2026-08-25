import { formatScheduleTimeRange } from '../../model/calendarDate'
import { koreanDate, typeLabel } from '../../model/calendarPresentation'
import { layoutDayTimelineSchedules } from '../../model/dayTimeline'
import { getScheduleColorClasses } from '../../model/scheduleColor'

import type { ScheduleSummary } from '../../api/scheduleCalendarApi'

const chipBaseClass =
  'mt-1 block w-full overflow-hidden rounded-md border px-2 py-1 text-left text-xs font-medium text-ellipsis whitespace-nowrap focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-1 sm:text-sm'

export function ScheduleChip({
  schedule,
  onOpen,
  testId,
}: {
  schedule: ScheduleSummary
  onOpen: (schedule: ScheduleSummary, trigger: HTMLButtonElement) => void
  testId?: string
}) {
  const color = getScheduleColorClasses(schedule.colorLabel)
  return (
    <button
      className={`${chipBaseClass} ${color.background} ${color.border} ${color.text}`}
      data-testid={testId}
      onClick={(event) => onOpen(schedule, event.currentTarget)}
      type="button"
    >
      {schedule.title} · {typeLabel(schedule.type)}
    </button>
  )
}

export function CalendarDayTimeline({
  date,
  schedules,
  onOpen,
}: {
  date: string
  schedules: ScheduleSummary[]
  onOpen: (schedule: ScheduleSummary, trigger: HTMLButtonElement) => void
}) {
  const allDaySchedules = schedules.filter((schedule) => schedule.allDay)
  const timedSchedules = schedules.filter((schedule) => !schedule.allDay)
  const placements = layoutDayTimelineSchedules(date, timedSchedules)
  const schedulesById = new Map(timedSchedules.map((schedule) => [schedule.id, schedule]))
  return (
    <section
      aria-label={`${koreanDate(date)} 일간 시간표`}
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
    >
      <div className="border-b border-border p-3" data-testid="calendar-day-all-day">
        <p className="mb-2 text-sm font-bold text-text-primary">하루 종일</p>
        {allDaySchedules.length === 0 ? (
          <p className="text-sm text-text-secondary">종일 일정이 없습니다.</p>
        ) : (
          allDaySchedules.map((schedule) => (
            <ScheduleChip key={schedule.id} onOpen={onOpen} schedule={schedule} />
          ))
        )}
      </div>
      <div className="grid grid-cols-[4rem_minmax(0,1fr)]" data-testid="calendar-day-timeline">
        <div className="border-r border-border bg-secondary" data-testid="calendar-day-time-labels">
          {Array.from({ length: 25 }, (_, hour) => (
            <div
              className={
                hour === 24
                  ? 'relative h-0 -top-2 px-2 text-right text-xs text-text-secondary'
                  : 'h-[60px] px-2 pt-1 text-right text-xs text-text-secondary'
              }
              key={hour}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div className="relative h-[1440px] bg-surface">
          {Array.from({ length: 24 }, (_, hour) => (
            <div className="h-[60px] border-b border-border/70" key={hour} />
          ))}
          {placements.map((placement) => {
            const schedule = schedulesById.get(placement.id)
            if (!schedule) {
              return null
            }
            const color = getScheduleColorClasses(schedule.colorLabel)
            return (
              <button
                className={`absolute right-2 left-2 overflow-hidden rounded-md border px-2 py-1 text-left text-xs font-medium ${color.background} ${color.border} ${color.text} focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-1`}
                data-testid={`calendar-day-timed-${schedule.id}`}
                key={schedule.id}
                onClick={(event) => onOpen(schedule, event.currentTarget)}
                style={{
                  top: `${placement.top}px`,
                  height: `${placement.height}px`,
                  left: `calc(${(placement.column / placement.columnCount) * 100}% + 0.5rem)`,
                  right: `calc(${((placement.columnCount - placement.column - 1) / placement.columnCount) * 100}% + 0.5rem)`,
                }}
                type="button"
              >
                {schedule.title} · {typeLabel(schedule.type)} ·{' '}
                {formatScheduleTimeRange(schedule.startAt, schedule.endAt, false)}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
