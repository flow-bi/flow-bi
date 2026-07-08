import { calendarViewOptions } from '../constants/calendarOptions'

import type { CalendarViewMode } from '../types/calendar'

type CalendarToolbarProps = {
  title: string
  viewMode: CalendarViewMode
  onAddSchedule: () => void
  onMoveDate: (direction: -1 | 1) => void
  onToday: () => void
  onViewModeChange: (viewMode: CalendarViewMode) => void
}

export function CalendarToolbar({
  onAddSchedule,
  onMoveDate,
  onToday,
  onViewModeChange,
  title,
  viewMode,
}: CalendarToolbarProps) {
  return (
    <article className="panel calendar-toolbar-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Calendar</p>
          <h2>{title}</h2>
        </div>
        <div className="calendar-toolbar-actions">
          <div className="time-slot-carousel calendar-date-nav" aria-label="캘린더 기간 이동">
            <button
              type="button"
              aria-label="이전 기간"
              onClick={() => {
                onMoveDate(-1)
              }}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button className="calendar-today-button" type="button" onClick={onToday}>
              오늘
            </button>
            <button
              type="button"
              aria-label="다음 기간"
              onClick={() => {
                onMoveDate(1)
              }}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
          <div className="tab-list" aria-label="캘린더 보기">
            {calendarViewOptions.map((option) => (
              <button
                className={viewMode === option.value ? 'tab active' : 'tab'}
                key={option.value}
                type="button"
                onClick={() => {
                  onViewModeChange(option.value)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button className="primary-button inline" type="button" onClick={onAddSchedule}>
            일정 추가
          </button>
        </div>
      </div>
    </article>
  )
}
