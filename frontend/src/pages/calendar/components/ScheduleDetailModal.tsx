import { formatScheduleTime, getScheduleTypeLabel, getVisibilityLabel } from '../lib/calendarUtils'

import type { CalendarSchedule } from '../types/calendar'

type ScheduleDetailModalProps = {
  schedule: CalendarSchedule | null
  onClose: () => void
}

export function ScheduleDetailModal({ onClose, schedule }: ScheduleDetailModalProps) {
  if (!schedule) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-panel schedule-detail-modal"
        aria-labelledby="schedule-detail-title"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div className="panel-header">
          <div>
            <p className="section-label">
              {schedule.roomReservation ? 'Room Reservation' : 'Schedule'}
            </p>
            <h2 id="schedule-detail-title">{schedule.title}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="schedule-detail-summary">
          <span className={`status-badge ${schedule.colorLabel.toLowerCase()}`}>
            {schedule.roomReservation ? '회의실 예약' : getScheduleTypeLabel(schedule.scheduleType)}
          </span>
          <span className="status-badge">{getVisibilityLabel(schedule.visibility)}</span>
        </div>

        <div className="detail-list">
          <div>
            <span>시간</span>
            <strong>
              {schedule.isAllDay
                ? '하루 종일'
                : `${formatScheduleTime(schedule.startAt)} - ${formatScheduleTime(schedule.endAt)}`}
            </strong>
          </div>
          <div>
            <span>장소</span>
            <strong>{schedule.location || '장소 미정'}</strong>
          </div>
          {schedule.roomReservation ? (
            <div>
              <span>회의실</span>
              <strong>
                {schedule.roomReservation.roomName} · {schedule.roomReservation.status}
              </strong>
            </div>
          ) : null}
          <div>
            <span>참석자</span>
            <strong>
              {schedule.attendees.length > 0
                ? schedule.attendees.map((attendee) => attendee.name).join(', ')
                : '참석자 없음'}
            </strong>
          </div>
          <div>
            <span>설명</span>
            <strong>{schedule.content || '설명 없음'}</strong>
          </div>
        </div>
      </section>
    </div>
  )
}
