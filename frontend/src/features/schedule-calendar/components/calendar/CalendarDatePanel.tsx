import { useEffect, useRef } from 'react'

import { CalendarDayTimeline } from './CalendarDayTimeline'
import { koreanDate } from '../../model/calendarPresentation'

import type { ScheduleSummary } from '../../api/scheduleCalendarApi'

export function CalendarDatePanel({
  date,
  schedules,
  onClose,
  onOpenSchedule,
}: {
  date: string
  schedules: ScheduleSummary[]
  onClose: () => void
  onOpenSchedule: (schedule: ScheduleSummary, trigger: HTMLButtonElement) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  return (
    <div
      className="fixed inset-0 z-10 bg-slate-950/55"
      data-testid="calendar-date-panel-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        aria-label={`${koreanDate(date)} 일정`}
        aria-modal="true"
        className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-background p-4 shadow-2xl sm:p-6"
        role="dialog"
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="m-0 text-xl font-bold text-text-primary">{koreanDate(date)} 일정</h2>
          <button
            aria-label="닫기"
            className="rounded p-2 text-text-primary focus-visible:outline-3 focus-visible:outline-focus-ring"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            ×
          </button>
        </header>
        <CalendarDayTimeline date={date} onOpen={onOpenSchedule} schedules={schedules} />
      </aside>
    </div>
  )
}
