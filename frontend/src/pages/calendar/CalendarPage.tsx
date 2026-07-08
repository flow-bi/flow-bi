import { useEffect, useMemo, useRef, useState } from 'react'

import { CalendarToolbar } from './components/CalendarToolbar'
import { DayCalendar } from './components/DayCalendar'
import { MonthCalendar } from './components/MonthCalendar'
import { ScheduleDetailModal } from './components/ScheduleDetailModal'
import { ScheduleFormModal } from './components/ScheduleFormModal'
import { ScheduleListPanel } from './components/ScheduleListPanel'
import { WeekCalendar } from './components/WeekCalendar'
import {
  buildScheduleDateTime,
  createInitialScheduleForm,
  filterSchedulesByDate,
  formatDateKey,
  getCalendarTitle,
  getMonthCells,
  getWeekDays,
  validateScheduleForm,
} from './lib/calendarUtils'
import { calendarProjectsMock, calendarTeamsMock, calendarUsersMock } from './mock/calendarMetaMock'
import { schedulesMock } from './mock/schedulesMock'

import type {
  CalendarSchedule,
  CalendarViewMode,
  ScheduleFormErrors,
  ScheduleFormValues,
} from './types/calendar'

const roomCalendarStorageKey = 'flowbi.roomReservationSchedules'

function isCalendarSchedule(value: unknown): value is CalendarSchedule {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const schedule = value as Record<string, unknown>

  return (
    typeof schedule.scheduleId === 'string' &&
    typeof schedule.title === 'string' &&
    typeof schedule.startAt === 'string' &&
    typeof schedule.endAt === 'string' &&
    typeof schedule.location === 'string'
  )
}

function getStoredRoomSchedules(): CalendarSchedule[] {
  try {
    const storedValue = localStorage.getItem(roomCalendarStorageKey)

    if (!storedValue) {
      return []
    }

    const parsedValue: unknown = JSON.parse(storedValue)

    return Array.isArray(parsedValue) ? parsedValue.filter(isCalendarSchedule) : []
  } catch {
    return []
  }
}

function CalendarPage() {
  const calendarWorkspaceRef = useRef<HTMLDivElement | null>(null)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [baseDate, setBaseDate] = useState(() => new Date('2026-07-06T00:00:00+09:00'))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<CalendarSchedule[]>(() => [
    ...schedulesMock,
    ...getStoredRoomSchedules(),
  ])
  const [selectedSchedule, setSelectedSchedule] = useState<CalendarSchedule | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<ScheduleFormValues>(() =>
    createInitialScheduleForm('2026-07-06'),
  )
  const [formErrors, setFormErrors] = useState<ScheduleFormErrors>({})
  const [saveMessage, setSaveMessage] = useState('')

  const monthCells = useMemo(() => getMonthCells(baseDate), [baseDate])
  const weekDays = useMemo(() => getWeekDays(baseDate), [baseDate])
  const activeDate = selectedDate ?? formatDateKey(baseDate)
  const selectedDateSchedules = useMemo(
    () => (selectedDate ? filterSchedulesByDate(schedules, selectedDate) : []),
    [schedules, selectedDate],
  )
  const visibleSchedules =
    viewMode === 'week'
      ? weekDays.flatMap((day) => filterSchedulesByDate(schedules, day.date))
      : schedules

  useEffect(() => {
    if (!selectedDate) {
      return undefined
    }

    const handleOutsidePointerDown = (event: MouseEvent) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      if (target.closest('.modal-backdrop')) {
        return
      }

      if (calendarWorkspaceRef.current?.contains(target)) {
        return
      }

      setSelectedDate(null)
    }

    document.addEventListener('mousedown', handleOutsidePointerDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown)
    }
  }, [selectedDate])

  const openScheduleForm = (date = activeDate) => {
    setFormValues(createInitialScheduleForm(date))
    setFormErrors({})
    setSaveMessage('')
    setIsFormOpen(true)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setBaseDate(new Date(`${date}T00:00:00+09:00`))
    setSaveMessage('')
  }

  const handleScheduleSubmit = () => {
    const errors = validateScheduleForm(formValues)
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    const nextSchedule: CalendarSchedule = {
      scheduleId: `schedule-local-${Date.now()}`,
      title: formValues.title.trim(),
      scheduleType: formValues.scheduleType,
      visibility: formValues.visibility,
      startAt: buildScheduleDateTime(formValues.date, formValues.startTime),
      endAt: buildScheduleDateTime(formValues.date, formValues.endTime),
      creatorId: 'user-001',
      location: formValues.location.trim(),
      content: formValues.content.trim(),
      targets:
        formValues.scheduleType === 'TEAM'
          ? formValues.teamId
            ? [formValues.teamId]
            : []
          : formValues.scheduleType === 'PROJECT' && formValues.projectId
            ? [formValues.projectId]
            : [],
      attendees: formValues.attendees,
      colorLabel: formValues.colorLabel,
      isAllDay: formValues.isAllDay,
    }

    setSchedules((currentSchedules) => [...currentSchedules, nextSchedule])
    setSelectedDate(formValues.date)
    setBaseDate(new Date(`${formValues.date}T00:00:00+09:00`))
    setIsFormOpen(false)
    setSaveMessage(
      '일정 등록 검토가 완료되었습니다. 실제 저장은 API 연동 이후 서버 응답을 따릅니다.',
    )
  }

  return (
    <section className="page-stack calendar-page">
      <CalendarToolbar
        title={getCalendarTitle(baseDate, viewMode)}
        viewMode={viewMode}
        onAddSchedule={() => {
          openScheduleForm()
        }}
        onMoveDate={(direction) => {
          setBaseDate((currentDate) => {
            const nextDate = new Date(currentDate)

            if (viewMode === 'month') {
              nextDate.setMonth(nextDate.getMonth() + direction)
            }

            if (viewMode === 'week') {
              nextDate.setDate(nextDate.getDate() + direction * 7)
            }

            if (viewMode === 'day') {
              nextDate.setDate(nextDate.getDate() + direction)
              setSelectedDate(formatDateKey(nextDate))
            }

            return nextDate
          })
          setSaveMessage('')
        }}
        onToday={() => {
          const today = new Date('2026-07-06T00:00:00+09:00')

          setBaseDate(today)
          setSelectedDate(formatDateKey(today))
          setSaveMessage('')
        }}
        onViewModeChange={setViewMode}
      />

      <div
        className={selectedDate ? 'calendar-workspace' : 'calendar-workspace calendar-only'}
        ref={calendarWorkspaceRef}
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        {viewMode === 'month' ? (
          <MonthCalendar
            monthCells={monthCells}
            schedules={schedules}
            selectedDate={selectedDate ?? ''}
            onAddSchedule={openScheduleForm}
            onDateSelect={handleDateSelect}
            onScheduleSelect={setSelectedSchedule}
          />
        ) : null}

        {viewMode === 'week' ? (
          <WeekCalendar
            schedules={visibleSchedules}
            selectedDate={selectedDate ?? ''}
            weekDays={weekDays}
            onAddSchedule={openScheduleForm}
            onDateSelect={handleDateSelect}
            onScheduleSelect={setSelectedSchedule}
          />
        ) : null}

        {viewMode === 'day' ? (
          <DayCalendar
            date={activeDate}
            schedules={filterSchedulesByDate(schedules, activeDate)}
            onAddSchedule={openScheduleForm}
            onScheduleSelect={setSelectedSchedule}
          />
        ) : null}

        {selectedDate ? (
          <ScheduleListPanel
            date={selectedDate}
            schedules={selectedDateSchedules}
            onAddSchedule={() => {
              openScheduleForm(selectedDate)
            }}
            onScheduleSelect={setSelectedSchedule}
          />
        ) : null}
      </div>

      {saveMessage.length > 0 ? (
        <div className="state-panel success" role="status">
          {saveMessage}
        </div>
      ) : null}

      <ScheduleDetailModal
        schedule={selectedSchedule}
        onClose={() => {
          setSelectedSchedule(null)
        }}
      />

      <ScheduleFormModal
        errors={formErrors}
        formValues={formValues}
        projects={calendarProjectsMock}
        teams={calendarTeamsMock}
        users={calendarUsersMock}
        onClose={() => {
          setIsFormOpen(false)
          setFormErrors({})
        }}
        onSubmit={handleScheduleSubmit}
        onValuesChange={(nextValues) => {
          setFormValues(nextValues)
          setFormErrors({})
          setSaveMessage('')
        }}
        open={isFormOpen}
      />
    </section>
  )
}

export default CalendarPage
