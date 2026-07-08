import { formatTime, getScheduleTypeLabel } from '../lib/formatDashboard'

import type { DashboardSchedule } from '../types/dashboard'

type TodaySchedulePanelProps = {
  schedules: DashboardSchedule[]
}

export function TodaySchedulePanel({ schedules }: TodaySchedulePanelProps) {
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Schedule</p>
          <h2>오늘 일정</h2>
        </div>
        <span className="success-badge">Success</span>
      </div>

      {schedules.length > 0 ? (
        <div className="schedule-list">
          {schedules.map((schedule) => (
            <article className="schedule-card" key={schedule.scheduleId}>
              <div className="schedule-color" style={{ backgroundColor: schedule.colorLabel }} />
              <div>
                <strong>{schedule.title}</strong>
                <p>
                  {formatTime(schedule.startAt)} - {formatTime(schedule.endAt)} ·{' '}
                  {schedule.location}
                </p>
              </div>
              <span>{getScheduleTypeLabel(schedule.scheduleType)}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">오늘 등록된 일정이 없습니다.</div>
      )}
    </article>
  )
}
