import { formatDate, formatTime } from '../lib/formatDashboard'

import type { WeeklyScheduleSummary } from '../types/dashboard'

type WeeklySchedulePanelProps = {
  selectedDate: string
  weeklySummaries: WeeklyScheduleSummary[]
  onDateSelect: (date: string) => void
}

export function WeeklySchedulePanel({
  onDateSelect,
  selectedDate,
  weeklySummaries,
}: WeeklySchedulePanelProps) {
  const selectedSummary = weeklySummaries.find((summary) => summary.date === selectedDate)

  return (
    <article className="panel weekly-schedule-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Week</p>
          <h2>주간 일정 요약</h2>
        </div>
      </div>

      <div className="week-strip" aria-label="주간 날짜 선택">
        {weeklySummaries.map((summary) => (
          <button
            aria-pressed={selectedDate === summary.date}
            className={selectedDate === summary.date ? 'week-day active' : 'week-day'}
            key={summary.date}
            type="button"
            onClick={() => {
              onDateSelect(summary.date)
            }}
          >
            <span>{summary.dayLabel}</span>
            <strong>{formatDate(summary.date)}</strong>
            <small>{summary.schedules.length}건</small>
          </button>
        ))}
      </div>

      {selectedSummary && selectedSummary.schedules.length > 0 ? (
        <div className="schedule-list compact">
          {selectedSummary.schedules.map((schedule) => (
            <article className="schedule-card" key={schedule.scheduleId}>
              <div className="schedule-color" style={{ backgroundColor: schedule.colorLabel }} />
              <div>
                <strong>{schedule.title}</strong>
                <p>
                  {formatTime(schedule.startAt)} - {formatTime(schedule.endAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">선택한 날짜에 등록된 일정이 없습니다.</div>
      )}
    </article>
  )
}
