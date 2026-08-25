import { formatCalendarHeading, type CalendarView } from '../../model/calendarDate'
import { activeControlButtonClass, controlButtonClass } from '../../model/calendarPresentation'

export function CalendarHeader({
  date,
  view,
  onNavigate,
  onToday,
  onSelectView,
  onCreateSchedule,
}: {
  date: string
  view: CalendarView
  onNavigate: (direction: -1 | 1) => void
  onToday: () => void
  onSelectView: (view: CalendarView) => void
  onCreateSchedule?: () => void
}) {
  return (
    <header
      className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-x-8"
      data-testid="calendar-header"
    >
      <div className="min-w-0">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
          {formatCalendarHeading(view, date)}
        </h1>
      </div>
      <div
        className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end"
        data-testid="calendar-header-actions"
      >
        <div
          aria-label="기간 이동"
          className="flex items-center gap-2"
          data-testid="calendar-period-controls"
          role="group"
        >
          <button className={controlButtonClass} onClick={() => onNavigate(-1)} type="button">
            이전
          </button>
          <button className={controlButtonClass} onClick={onToday} type="button">
            오늘
          </button>
          <button className={controlButtonClass} onClick={() => onNavigate(1)} type="button">
            다음
          </button>
        </div>
        <div
          aria-label="보기 선택"
          className="flex flex-wrap items-center gap-2"
          data-testid="calendar-view-controls"
          role="group"
        >
          {(['month', 'week', 'day'] as const).map((candidate) => (
            <button
              aria-pressed={view === candidate}
              className={view === candidate ? activeControlButtonClass : controlButtonClass}
              key={candidate}
              onClick={() => onSelectView(candidate)}
              type="button"
            >
              {candidate === 'month'
                ? '월간 보기'
                : candidate === 'week'
                  ? '주간 보기'
                  : '일간 보기'}
            </button>
          ))}
        </div>
        {onCreateSchedule && (
          <button
            className="ml-auto rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
            data-testid="calendar-create-action"
            onClick={onCreateSchedule}
            type="button"
          >
            일정 추가
          </button>
        )}
      </div>
    </header>
  )
}
