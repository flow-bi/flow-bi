import { useMemo, useState } from 'react'

import { SidePanel } from '../../../../shared/components/SidePanel'
import { useSchedules } from '../hooks'
import { ScheduleDetailModal } from './ScheduleDetailModal'
import { ScheduleFormModal } from './ScheduleFormModal'

import type { CalendarView } from '../types'

export function CalendarPage() {
  const [view, setView] = useState<CalendarView>('month')
  const [date, setDate] = useState(() => toDateInput(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()))
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null)
  const schedulesQuery = useSchedules(view, date)
  const schedules = schedulesQuery.data ?? []
  const days = useMemo(() => buildDays(view, date), [date, view])
  const selectedDaySchedules = schedules.filter((schedule) =>
    isSameDay(schedule.startAt, selectedDate),
  )

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-[24px] font-bold">캘린더</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            월/주/일 단위로 일정을 조회하고 관리합니다.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className="form-input h-10 w-28"
            value={view}
            onChange={(event) => setView(event.target.value as CalendarView)}
          >
            <option value="month">월간</option>
            <option value="week">주간</option>
            <option value="day">일간</option>
          </select>
          <input
            className="form-input h-10 w-40"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button
            className="h-10 rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
            type="button"
            onClick={() => {
              setSelectedDate(date)
              setIsCreateOpen(true)
            }}
          >
            일정 추가
          </button>
        </div>
      </header>

      {schedulesQuery.isPending ? (
        <p className="rounded-md bg-[var(--color-surface)] p-4 text-sm">
          일정을 불러오는 중입니다.
        </p>
      ) : null}
      {schedulesQuery.isError ? (
        <p className="rounded-md bg-[var(--color-surface)] p-4 text-sm text-[var(--color-danger)]">
          일정을 불러오지 못했습니다.
        </p>
      ) : null}

      <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-7">
        {days.map((day) => {
          const daySchedules = schedules.filter((schedule) => isSameDay(schedule.startAt, day.date))
          return (
            <button
              key={day.date}
              className={`min-h-32 bg-[var(--color-surface)] p-3 text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                day.isCurrentMonth ? '' : 'text-[var(--color-text-muted)]'
              }`}
              type="button"
              onClick={() => {
                setSelectedDate(day.date)
                setIsDayPanelOpen(true)
              }}
            >
              <span className="text-sm font-semibold tabular-nums">{day.label}</span>
              <div className="mt-3 space-y-1">
                {daySchedules.slice(0, 3).map((schedule) => (
                  <span
                    key={schedule.scheduleId}
                    className="block truncate rounded-sm bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-semibold"
                  >
                    {schedule.title}
                  </span>
                ))}
                {daySchedules.length > 3 ? (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    +{daySchedules.length - 3}
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      <SidePanel
        title={`${selectedDate} 일정`}
        isOpen={isDayPanelOpen}
        onClose={() => setIsDayPanelOpen(false)}
      >
        <div className="space-y-3">
          {selectedDaySchedules.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              등록된 일정이 없습니다. 일정 추가 버튼으로 새 일정을 추가하세요.
            </p>
          ) : null}
          {selectedDaySchedules.map((schedule) => (
            <button
              key={schedule.scheduleId}
              className="w-full rounded-md border border-[var(--color-border)] p-3 text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              type="button"
              onClick={() => setSelectedScheduleId(schedule.scheduleId)}
            >
              <p className="text-sm font-semibold">{schedule.title}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {timeOnly(schedule.startAt)} - {timeOnly(schedule.endAt)}
              </p>
            </button>
          ))}
        </div>
      </SidePanel>

      <ScheduleFormModal
        isOpen={isCreateOpen}
        selectedDate={selectedDate}
        onClose={() => setIsCreateOpen(false)}
      />
      <ScheduleDetailModal
        scheduleId={selectedScheduleId}
        onClose={() => setSelectedScheduleId(null)}
      />
    </section>
  )
}

function buildDays(view: CalendarView, dateValue: string) {
  const base = new Date(`${dateValue}T00:00:00`)
  if (view === 'day') {
    return [{ date: toDateInput(base), label: base.getDate().toString(), isCurrentMonth: true }]
  }

  if (view === 'week') {
    const monday = new Date(base)
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return { date: toDateInput(date), label: date.getDate().toString(), isCurrentMonth: true }
    })
  }

  const first = new Date(base.getFullYear(), base.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date: toDateInput(date),
      label: date.getDate().toString(),
      isCurrentMonth: date.getMonth() === base.getMonth(),
    }
  })
}

function isSameDay(value: string, date: string) {
  return value.slice(0, 10) === date
}

function timeOnly(value: string) {
  return value.slice(11, 16)
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
