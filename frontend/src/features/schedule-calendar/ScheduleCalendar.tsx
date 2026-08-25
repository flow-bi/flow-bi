import { useEffect, useRef, useState } from 'react'

import {
  cancelRoomReservation as cancelRoomReservationRequest,
  cancelSchedule as cancelScheduleRequest,
  getScheduleDetail as getScheduleDetailRequest,
  getScheduleTargetOptions as getScheduleTargetOptionsRequest,
  getSchedules as getSchedulesRequest,
  searchAttendees as searchAttendeesRequest,
  updateSchedule as updateScheduleRequest,
  type AttendeeCandidate,
  type ScheduleDetail,
  type ScheduleSummary,
  type ScheduleTargetOptions,
  type UpdateScheduleRequest,
} from './api/scheduleCalendarApi'
import { CalendarDatePanel } from './components/calendar/CalendarDatePanel'
import { CalendarDayTimeline } from './components/calendar/CalendarDayTimeline'
import { CalendarGrid } from './components/calendar/CalendarGrid'
import { CalendarHeader } from './components/calendar/CalendarHeader'
import { ScheduleCancellationDialog } from './components/schedule/ScheduleCancellationDialog'
import { ScheduleDetailModal } from './components/schedule/ScheduleDetailModal'
import { ScheduleEditModal } from './components/schedule/ScheduleEditModal'
import { useScheduleCalendarData } from './hooks/useScheduleCalendarData'
import { getCalendarPeriod, navigateDate } from './model/calendarDate'
import {
  dateValue,
  listErrorText,
  readCalendarUrlState,
  scheduleOnDate,
} from './model/calendarPresentation'

export interface ScheduleCalendarProps {
  getSchedules?: (
    period: { from: string; to: string },
    signal?: AbortSignal,
  ) => Promise<ScheduleSummary[]>
  getScheduleDetail?: (id: number, signal?: AbortSignal) => Promise<ScheduleDetail>
  updateSchedule?: (id: number, request: UpdateScheduleRequest) => Promise<ScheduleDetail>
  cancelSchedule?: (id: number) => Promise<void>
  searchAttendees?: (query: string) => Promise<AttendeeCandidate[]>
  getTargetOptions?: () => Promise<ScheduleTargetOptions>
  cancelRoomReservation?: (reservationId: number) => Promise<void>
  onCreateSchedule?: () => void
  now?: () => Date
}

export function ScheduleCalendar({
  getSchedules = getSchedulesRequest,
  getScheduleDetail = getScheduleDetailRequest,
  updateSchedule = updateScheduleRequest,
  cancelSchedule = cancelScheduleRequest,
  searchAttendees = searchAttendeesRequest,
  getTargetOptions = getScheduleTargetOptionsRequest,
  cancelRoomReservation = cancelRoomReservationRequest,
  onCreateSchedule,
  now = () => new Date(),
}: ScheduleCalendarProps) {
  const [urlState, setUrlState] = useState(() => readCalendarUrlState(now))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [cancelConfirmation, setCancelConfirmation] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const scheduleTrigger = useRef<HTMLElement | null>(null)
  const selectedDateTrigger = useRef<HTMLButtonElement | null>(null)
  const cancellationFocusFallback = useRef<HTMLButtonElement | null>(null)
  const cancellationTrigger = useRef<HTMLButtonElement | null>(null)
  const cancellationSubmitted = useRef(false)
  const period = getCalendarPeriod(urlState.view, urlState.date)
  const data = useScheduleCalendarData({
    period,
    selectedSchedule,
    getSchedules,
    getScheduleDetail,
    updateSchedule,
    cancelSchedule,
    cancelRoomReservation,
    onUpdateSuccess: () => {
      setEditing(false)
      setActionError(null)
    },
    onCancelSuccess: (roomManaged) => {
      cancellationSubmitted.current = false
      setCancelConfirmation(false)
      setActionError(null)
      setNotice(
        roomManaged ? '회의실 예약과 연결 일정이 취소되었습니다.' : '일정이 취소되었습니다.',
      )
      setSelectedSchedule(null)
      window.setTimeout(() => cancellationFocusFallback.current?.focus(), 0)
    },
    onActionError: (message) => {
      cancellationSubmitted.current = false
      setCancelConfirmation(false)
      setActionError(message)
    },
  })
  const setLocationState = (next: typeof urlState) => {
    const params = new URLSearchParams({ view: next.view, date: next.date })
    window.history.pushState({}, '', `${window.location.pathname}?${params}`)
    setUrlState(next)
  }
  useEffect(() => {
    const popstate = () => setUrlState(readCalendarUrlState(now))
    window.addEventListener('popstate', popstate)
    return () => window.removeEventListener('popstate', popstate)
  }, [now])
  const openDetail = (schedule: ScheduleSummary, trigger: HTMLElement) => {
    scheduleTrigger.current = trigger
    cancellationFocusFallback.current =
      trigger.closest('article')?.querySelector<HTMLButtonElement>('[data-calendar-day-button]') ??
      null
    setSelectedSchedule(schedule.id)
  }
  const closeDetail = () => {
    data.clearAttendeeCandidates()
    setSelectedSchedule(null)
    scheduleTrigger.current?.focus()
  }
  const closeDatePanel = () => {
    setSelectedDate(null)
    window.setTimeout(() => selectedDateTrigger.current?.focus(), 0)
  }
  const dismissCancellation = () => {
    setCancelConfirmation(false)
    window.setTimeout(() => cancellationTrigger.current?.focus(), 0)
  }
  const daySchedules = (data.schedulesQuery.data ?? []).filter(
    (schedule) => selectedDate !== null && scheduleOnDate(schedule, selectedDate),
  )
  const detail = data.detailQuery.data
  return (
    <main className="min-h-screen overflow-x-hidden p-4 sm:p-8">
      <CalendarHeader
        date={urlState.date}
        onCreateSchedule={onCreateSchedule}
        onNavigate={(direction) =>
          setLocationState({
            ...urlState,
            date: navigateDate(urlState.view, urlState.date, direction),
          })
        }
        onSelectView={(view) => setLocationState({ ...urlState, view })}
        onToday={() => setLocationState({ ...urlState, date: dateValue(now()) })}
        view={urlState.view}
      />
      {data.schedulesQuery.isLoading && (
        <p className="mb-4 text-text-secondary" role="status">
          일정을 불러오고 있습니다.
        </p>
      )}
      {notice && (
        <p className="mb-4 text-text-secondary" role="status">
          {notice}
        </p>
      )}
      {data.schedulesQuery.isError && (
        <section className="my-8 rounded-lg bg-surface p-4 shadow-md" role="alert">
          <p>{listErrorText(data.schedulesQuery.error)}</p>
          <button onClick={() => void data.schedulesQuery.refetch()} type="button">
            다시 시도
          </button>
        </section>
      )}
      {data.schedulesQuery.isSuccess && data.schedulesQuery.data.length === 0 && (
        <p className="my-8 rounded-lg bg-surface p-4 shadow-md">이 기간에는 일정이 없습니다.</p>
      )}
      {data.schedulesQuery.isSuccess &&
        (urlState.view === 'day' ? (
          <CalendarDayTimeline
            date={urlState.date}
            onOpen={openDetail}
            schedules={(data.schedulesQuery.data ?? []).filter((schedule) =>
              scheduleOnDate(schedule, urlState.date),
            )}
          />
        ) : (
          <CalendarGrid
            date={urlState.date}
            onOpenSchedule={openDetail}
            onSelectDate={(date, trigger) => {
              selectedDateTrigger.current = trigger
              setSelectedDate(date)
            }}
            schedules={data.schedulesQuery.data ?? []}
            view={urlState.view}
          />
        ))}
      {selectedDate && (
        <CalendarDatePanel
          date={selectedDate}
          onClose={closeDatePanel}
          onOpenSchedule={openDetail}
          schedules={daySchedules}
        />
      )}
      {selectedSchedule !== null && data.detailQuery.isLoading && (
        <p role="status">일정 상세를 불러오고 있습니다.</p>
      )}
      {detail && !editing && (
        <ScheduleDetailModal
          detail={detail}
          error={actionError}
          hasConfirmation={cancelConfirmation}
          onCancel={(trigger) => {
            cancellationTrigger.current = trigger
            setCancelConfirmation(true)
          }}
          onClose={closeDetail}
          onEdit={() => {
            setActionError(null)
            setEditing(true)
          }}
        />
      )}
      {detail && editing && (
        <ScheduleEditModal
          detail={detail}
          error={actionError}
          getTargetOptions={getTargetOptions}
          isSaving={data.updateMutation.isPending}
          onClose={() => {
            data.clearAttendeeCandidates()
            setEditing(false)
          }}
          onSave={(request) => data.updateMutation.mutate({ id: detail.id, request })}
          searchAttendees={searchAttendees}
        />
      )}
      {detail && cancelConfirmation && (
        <ScheduleCancellationDialog
          detail={detail}
          isPending={data.cancelMutation.isPending}
          onConfirm={() => {
            if (cancellationSubmitted.current) {
              return
            }
            cancellationSubmitted.current = true
            data.cancelMutation.mutate(
              detail.meetingRoomManaged
                ? { id: detail.roomReservationId as number, kind: 'roomReservation' }
                : { id: detail.id, kind: 'schedule' },
            )
          }}
          onDismiss={dismissCancellation}
        />
      )}
      {data.detailQuery.isError && <p role="alert">일정 상세를 불러오지 못했습니다.</p>}
    </main>
  )
}
