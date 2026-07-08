import { useMemo, useState } from 'react'

import {
  colorLabelOptions,
  scheduleTypeOptions,
  visibilityOptions,
} from '../constants/calendarOptions'

import type {
  CalendarProject,
  CalendarTeam,
  CalendarUser,
  ScheduleFormErrors,
  ScheduleFormValues,
} from '../types/calendar'

const scheduleTypeVisuals: Record<
  ScheduleFormValues['scheduleType'],
  { icon: string; hint: string }
> = {
  PERSONAL: { icon: '👤', hint: '나만 관리하는 일정' },
  TEAM: { icon: '👥', hint: '팀 단위 공유 일정' },
  PROJECT: { icon: '📁', hint: '프로젝트 참여자 일정' },
}

const visibilityVisuals: Record<ScheduleFormValues['visibility'], { icon: string; hint: string }> =
  {
    PRIVATE: { icon: '🔒', hint: '나에게만 표시' },
    PUBLIC: { icon: '🌐', hint: '전사 구성원 공개' },
    TEAM: { icon: '🏢', hint: '소속 팀에 공개' },
  }

type ScheduleFormModalProps = {
  errors: ScheduleFormErrors
  formValues: ScheduleFormValues
  open: boolean
  projects: CalendarProject[]
  teams: CalendarTeam[]
  users: CalendarUser[]
  onClose: () => void
  onSubmit: () => void
  onValuesChange: (values: ScheduleFormValues) => void
}

export function ScheduleFormModal({
  errors,
  formValues,
  onClose,
  onSubmit,
  onValuesChange,
  open,
  projects,
  teams,
  users,
}: ScheduleFormModalProps) {
  const [attendeeQuery, setAttendeeQuery] = useState('')
  const attendeeSuggestions = useMemo(() => {
    const query = attendeeQuery.trim()

    if (query.length === 0) {
      return []
    }

    return users
      .filter((user) => user.name.startsWith(query))
      .filter((user) => !formValues.attendees.some((attendee) => attendee.userId === user.userId))
  }, [attendeeQuery, formValues.attendees, users])

  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-panel schedule-form-modal"
        aria-labelledby="schedule-form-title"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div className="panel-header">
          <div>
            <p className="section-label">New Schedule</p>
            <h2 id="schedule-form-title">일정 등록</h2>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <form className="reservation-form">
          <label className="field">
            <span>일정 제목</span>
            <input
              placeholder="예: 프로젝트 리뷰"
              value={formValues.title}
              onChange={(event) => {
                onValuesChange({ ...formValues, title: event.target.value })
              }}
            />
            {errors.title ? <small>{errors.title}</small> : null}
          </label>

          <div className="form-option-stack">
            <div className="field">
              <span>일정 유형</span>
              <div className="option-card-grid">
                {scheduleTypeOptions.map((option) => {
                  const visual = scheduleTypeVisuals[option.value]

                  return (
                    <button
                      className={
                        formValues.scheduleType === option.value
                          ? 'option-card selected'
                          : 'option-card'
                      }
                      key={option.value}
                      type="button"
                      aria-pressed={formValues.scheduleType === option.value}
                      onClick={() => {
                        onValuesChange({
                          ...formValues,
                          projectId: '',
                          scheduleType: option.value,
                          teamId: '',
                        })
                      }}
                    >
                      <span aria-hidden="true">{visual.icon}</span>
                      <strong>{option.label}</strong>
                      <small>{visual.hint}</small>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="field">
              <span>공개 범위</span>
              <div className="option-card-grid">
                {visibilityOptions.map((option) => {
                  const visual = visibilityVisuals[option.value]

                  return (
                    <button
                      className={
                        formValues.visibility === option.value
                          ? 'option-card selected'
                          : 'option-card'
                      }
                      key={option.value}
                      type="button"
                      aria-pressed={formValues.visibility === option.value}
                      onClick={() => {
                        onValuesChange({
                          ...formValues,
                          visibility: option.value,
                        })
                      }}
                    >
                      <span aria-hidden="true">{visual.icon}</span>
                      <strong>{option.label}</strong>
                      <small>{visual.hint}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {formValues.scheduleType === 'TEAM' ? (
            <label className="field">
              <span>팀</span>
              <select
                value={formValues.teamId}
                onChange={(event) => {
                  onValuesChange({ ...formValues, teamId: event.target.value })
                }}
              >
                <option value="">팀 선택</option>
                {teams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
              {errors.teamId ? <small>{errors.teamId}</small> : null}
            </label>
          ) : null}

          {formValues.scheduleType === 'PROJECT' ? (
            <label className="field">
              <span>프로젝트</span>
              <select
                value={formValues.projectId}
                onChange={(event) => {
                  onValuesChange({ ...formValues, projectId: event.target.value })
                }}
              >
                <option value="">프로젝트 선택</option>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectName}
                  </option>
                ))}
              </select>
              {errors.projectId ? <small>{errors.projectId}</small> : null}
            </label>
          ) : null}

          <label className="field">
            <span>날짜</span>
            <input
              type="date"
              value={formValues.date}
              onChange={(event) => {
                onValuesChange({ ...formValues, date: event.target.value })
              }}
            />
            {errors.date ? <small>{errors.date}</small> : null}
          </label>

          <label className="calendar-checkbox">
            <input
              checked={formValues.isAllDay}
              type="checkbox"
              onChange={(event) => {
                onValuesChange({
                  ...formValues,
                  endTime: event.target.checked ? '18:00' : formValues.endTime,
                  isAllDay: event.target.checked,
                  startTime: event.target.checked ? '09:00' : formValues.startTime,
                })
              }}
            />
            <span>하루 종일</span>
          </label>

          <div className="form-two-column">
            <label className="field">
              <span>시작 시간</span>
              <input
                disabled={formValues.isAllDay}
                type="time"
                value={formValues.startTime}
                onChange={(event) => {
                  onValuesChange({ ...formValues, startTime: event.target.value })
                }}
              />
              {errors.startTime ? <small>{errors.startTime}</small> : null}
            </label>
            <label className="field">
              <span>종료 시간</span>
              <input
                disabled={formValues.isAllDay}
                type="time"
                value={formValues.endTime}
                onChange={(event) => {
                  onValuesChange({ ...formValues, endTime: event.target.value })
                }}
              />
              {errors.endTime ? <small>{errors.endTime}</small> : null}
            </label>
          </div>

          <div className="form-two-column">
            <label className="field">
              <span>위치</span>
              <input
                placeholder="예: 회의실 A"
                value={formValues.location}
                onChange={(event) => {
                  onValuesChange({ ...formValues, location: event.target.value })
                }}
              />
            </label>
            <label className="field">
              <span>색상 라벨</span>
              <select
                value={formValues.colorLabel}
                onChange={(event) => {
                  onValuesChange({
                    ...formValues,
                    colorLabel: event.target.value as ScheduleFormValues['colorLabel'],
                  })
                }}
              >
                {colorLabelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field attendee-search-field">
            <span>참석자</span>
            <input
              placeholder="이름 검색"
              value={attendeeQuery}
              onChange={(event) => {
                setAttendeeQuery(event.target.value)
              }}
            />
            {formValues.attendees.length > 0 ? (
              <div className="attendee-chip-list">
                {formValues.attendees.map((attendee) => (
                  <button
                    className="attendee-chip"
                    key={attendee.userId}
                    type="button"
                    onClick={() => {
                      onValuesChange({
                        ...formValues,
                        attendees: formValues.attendees.filter(
                          (selectedAttendee) => selectedAttendee.userId !== attendee.userId,
                        ),
                      })
                    }}
                  >
                    {attendee.name}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            ) : null}
            {attendeeQuery.trim().length > 0 ? (
              <div className="attendee-suggestion-list">
                {attendeeSuggestions.length > 0 ? (
                  attendeeSuggestions.map((user) => (
                    <button
                      className="attendee-suggestion"
                      key={user.userId}
                      type="button"
                      onClick={() => {
                        onValuesChange({
                          ...formValues,
                          attendees: [
                            ...formValues.attendees,
                            {
                              userId: user.userId,
                              name: user.name,
                              team: user.team,
                              position: user.position,
                            },
                          ],
                        })
                        setAttendeeQuery('')
                      }}
                    >
                      <strong>{user.name}</strong>
                      <span>
                        {user.team} · {user.position}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="attendee-suggestion-empty">검색 결과가 없습니다.</div>
                )}
              </div>
            ) : null}
          </div>

          <label className="field">
            <span>설명</span>
            <textarea
              rows={4}
              value={formValues.content}
              onChange={(event) => {
                onValuesChange({ ...formValues, content: event.target.value })
              }}
            />
          </label>

          <button className="primary-button" type="button" onClick={onSubmit}>
            일정 등록 검토
          </button>
        </form>
      </section>
    </div>
  )
}
