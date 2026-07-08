import { useMemo, useState } from 'react'

import { ReservationDrawer } from './components/ReservationDrawer'
import { ReservationOverview } from './components/ReservationOverview'
import { RoomList } from './components/RoomList'
import { RoomSearchPanel } from './components/RoomSearchPanel'
import { buildReservationDateTime, filterRooms, validateReservationForm } from './lib/roomUtils'
import { attendeesMock } from './mock/attendeesMock'
import { roomsMock } from './mock/roomsMock'

import type {
  ReservationFormErrors,
  ReservationFormValues,
  Room,
  RoomReservation,
  RoomSearchFilters,
} from './types/rooms'
import type { CalendarSchedule } from '../calendar/types/calendar'

const initialFilters: RoomSearchFilters = {
  date: '2026-07-05',
  startTime: '14:00',
  endTime: '15:00',
  minCapacity: '',
  status: 'ALL',
}

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

function getStoredCalendarSchedules(): CalendarSchedule[] {
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

function createReservationForm(room: Room, filters: RoomSearchFilters): ReservationFormValues {
  return {
    title: '',
    date: filters.date,
    startTime: filters.startTime,
    endTime: filters.endTime,
    count: '0',
    roomId: room.roomId,
    attendees: [],
  }
}

function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(roomsMock)
  const [filters, setFilters] = useState<RoomSearchFilters>(initialFilters)
  const [draftFilters, setDraftFilters] = useState<RoomSearchFilters>(initialFilters)
  const [isOverviewOpen, setIsOverviewOpen] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [reservationForm, setReservationForm] = useState<ReservationFormValues | null>(null)
  const [formErrors, setFormErrors] = useState<ReservationFormErrors>({})
  const [reviewMessage, setReviewMessage] = useState('')

  const filteredRooms = useMemo(() => filterRooms(rooms, filters), [filters, rooms])

  const handleReserve = (room: Room) => {
    const nextForm = createReservationForm(room, filters)

    setSelectedRoom(room)
    setReservationForm(nextForm)
    setFormErrors({})
    setReviewMessage('')
  }

  const handleSearch = () => {
    setFilters(draftFilters)
    setIsOverviewOpen(true)
    setReviewMessage('')
  }

  const handleResetSearch = () => {
    setDraftFilters(initialFilters)
    setFilters(initialFilters)
    setIsOverviewOpen(true)
    setReviewMessage('')
  }

  const handleOverviewDateChange = (date: string) => {
    setFilters((currentFilters) => ({ ...currentFilters, date }))
    setDraftFilters((currentFilters) => ({ ...currentFilters, date }))
    setReviewMessage('')
  }

  const handleReservationSubmit = () => {
    if (!reservationForm || !selectedRoom) {
      return
    }

    const errors = validateReservationForm(reservationForm)
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      setReviewMessage('')
      return
    }

    const reservationId = `reservation-local-${Date.now()}`
    const scheduleId = `schedule-room-local-${Date.now()}`
    const startAt = buildReservationDateTime(reservationForm.date, reservationForm.startTime)
    const endAt = buildReservationDateTime(reservationForm.date, reservationForm.endTime)
    const nextReservation: RoomReservation = {
      reservationId,
      roomId: selectedRoom.roomId,
      scheduleId,
      title: reservationForm.title.trim(),
      teamName: reservationForm.attendees[0]?.teamName ?? '예약팀 미정',
      organizerName: '김윤미',
      startAt,
      endAt,
      status: 'CONFIRMED',
      count: reservationForm.attendees.length,
    }
    const calendarSchedule: CalendarSchedule = {
      scheduleId,
      title: `회의실 예약: ${reservationForm.title.trim()}`,
      scheduleType: 'TEAM',
      visibility: 'TEAM',
      startAt,
      endAt,
      creatorId: 'user-001',
      location: `${selectedRoom.roomName} · ${selectedRoom.location}`,
      content: '회의실 예약 화면에서 생성된 일정입니다.',
      targets: [],
      attendees: reservationForm.attendees.map((attendee) => ({
        userId: attendee.userId,
        name: attendee.name,
        team: attendee.teamName,
        position: attendee.position,
      })),
      colorLabel: 'AMBER',
      roomReservation: {
        reservationId,
        roomId: selectedRoom.roomId,
        roomName: selectedRoom.roomName,
        status: 'CONFIRMED',
      },
    }

    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.roomId === selectedRoom.roomId
          ? { ...room, reservations: [...room.reservations, nextReservation] }
          : room,
      ),
    )

    localStorage.setItem(
      roomCalendarStorageKey,
      JSON.stringify([...getStoredCalendarSchedules(), calendarSchedule]),
    )

    setFilters((currentFilters) => ({
      ...currentFilters,
      date: reservationForm.date,
      endTime: reservationForm.endTime,
      startTime: reservationForm.startTime,
    }))
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      date: reservationForm.date,
      endTime: reservationForm.endTime,
      startTime: reservationForm.startTime,
    }))
    setSelectedRoom(null)
    setReservationForm(null)
    setFormErrors({})
    setIsOverviewOpen(true)
    setReviewMessage(
      `${selectedRoom.roomName} ${reservationForm.date} ${reservationForm.startTime}-${reservationForm.endTime} 예약이 완료되었습니다. 캘린더 일정에도 등록되었습니다.`,
    )
  }

  return (
    <section className="page-stack rooms-page">
      <RoomSearchPanel
        filters={draftFilters}
        onFiltersChange={setDraftFilters}
        onReset={handleResetSearch}
        onSearch={handleSearch}
      />

      <div className={isOverviewOpen ? 'rooms-content-grid' : 'rooms-content-grid list-only'}>
        <RoomList
          filters={filters}
          isOverviewOpen={isOverviewOpen}
          rooms={filteredRooms}
          onReserve={handleReserve}
        />
        {isOverviewOpen ? (
          <ReservationOverview
            filters={filters}
            rooms={filteredRooms}
            onDateChange={handleOverviewDateChange}
          />
        ) : null}
      </div>
      {reviewMessage.length > 0 ? (
        <div className="state-panel success" role="status">
          {reviewMessage}
        </div>
      ) : null}

      <ReservationDrawer
        errors={formErrors}
        formValues={
          reservationForm ?? {
            title: '',
            date: filters.date,
            startTime: filters.startTime,
            endTime: filters.endTime,
            count: '0',
            roomId: selectedRoom?.roomId ?? '',
            attendees: [],
          }
        }
        room={selectedRoom}
        attendees={attendeesMock}
        onClose={() => {
          setSelectedRoom(null)
          setReservationForm(null)
          setFormErrors({})
        }}
        onSubmit={handleReservationSubmit}
        onValuesChange={(values) => {
          setReservationForm(values)
          setFormErrors({})
          setReviewMessage('')
        }}
      />
    </section>
  )
}

export default RoomsPage
