import { formatDisplayDate, formatScheduleTime, getScheduleTypeLabel } from '../lib/calendarUtils'

import type { CalendarSchedule } from '../types/calendar'

type ScheduleListPanelProps = {
  date: string
  schedules: CalendarSchedule[]
  onAddSchedule: () => void
  onScheduleSelect: (schedule: CalendarSchedule) => void
}

export function ScheduleListPanel({
  date,
  onAddSchedule,
  onScheduleSelect,
  schedules,
}: ScheduleListPanelProps) {
  return (
    <aside className="panel selected-schedule-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Selected Day</p>
          <h2>{formatDisplayDate(date)}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={onAddSchedule}>
          추가
        </button>
      </div>

      {schedules.length > 0 ? (
        <div className="selected-schedule-list">
          {schedules.map((schedule) => (
            <button
              className={`selected-schedule-card ${schedule.colorLabel.toLowerCase()}`}
              key={schedule.scheduleId}
              type="button"
              onClick={() => {
                onScheduleSelect(schedule)
              }}
            >
              <span>
                {schedule.isAllDay
                  ? '하루 종일'
                  : `${formatScheduleTime(schedule.startAt)} - ${formatScheduleTime(schedule.endAt)}`}
              </span>
              <strong>{schedule.title}</strong>
              <small>
                {schedule.roomReservation
                  ? '회의실 예약'
                  : getScheduleTypeLabel(schedule.scheduleType)}
                {' · '}
                {schedule.location || '장소 미정'}
              </small>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">선택한 날짜에 일정이 없습니다.</div>
      )}
    </aside>
  )
}
