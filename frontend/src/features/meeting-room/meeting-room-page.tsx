import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'

import {
  type EditableRoomReservation,
  MeetingRoomGatewayError,
  ROOM_AVAILABILITY_STATUSES,
  isMeetingRoomGatewayError,
  type MeetingRoomGateway,
  type RoomAvailabilityStatus,
  type RoomAvailabilityQuery,
  type RoomAvailabilityResponse,
  type RoomSummary,
} from './meeting-room-gateway'
import { TIME_INPUT_STEP_SECONDS, validateMeetingTimes } from './meeting-time'
import {
  initialReservationValuesFromSearch,
  type ReservationFormValues,
} from './reservation-form-schema'
import { ReservationPanel } from './reservation-panel'
import { ReservationTextList, ReservationTimetable } from './reservation-timetable'
import { ROOM_AVAILABILITY_STATUS_LABELS } from './room-availability-status'

interface MeetingRoomPageProps {
  gateway: MeetingRoomGateway
  initialDate?: string
}

interface SearchForm {
  minimumCapacity: string
  date: string
  startTime: string
  endTime: string
  availabilityStatus: '' | RoomAvailabilityStatus
}

type SearchFormErrors = Partial<Pick<SearchForm, 'startTime' | 'endTime'>>

const defaultImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23e5e7eb'/%3E%3Cpath d='M70 130h180V80H70zM95 80V50h130v30' fill='%239ca3af'/%3E%3C/svg%3E"
const defaultDate = new Date().toISOString().slice(0, 10)

function initialSearch(date: string): SearchForm {
  return {
    minimumCapacity: '',
    date,
    startTime: '09:00',
    endTime: '18:00',
    availabilityStatus: '',
  }
}

function toQuery(search: SearchForm): RoomAvailabilityQuery {
  return {
    date: search.date,
    startTime: search.startTime,
    endTime: search.endTime,
    ...(search.minimumCapacity === '' ? {} : { minimumCapacity: Number(search.minimumCapacity) }),
    ...(search.availabilityStatus === '' ? {} : { availabilityStatus: search.availabilityStatus }),
  }
}

function RoomCard({
  room,
  onReserve,
  onEdit,
  isSubmissionAvailable,
  isUpdateAvailable,
}: {
  room: RoomSummary
  onReserve: (room: RoomSummary, trigger: HTMLButtonElement) => void
  onEdit: (
    room: RoomSummary,
    reservation: RoomSummary['reservations'][number],
    trigger: HTMLButtonElement,
  ) => void
  isSubmissionAvailable: boolean
  isUpdateAvailable: boolean
}) {
  return (
    <article
      className="rounded-xl bg-(--color-surface) p-4 shadow-sm"
      aria-labelledby={`room-${room.id}`}
    >
      <div className="flex gap-4">
        <img
          className="h-24 w-36 rounded object-cover"
          src={defaultImage}
          alt={`${room.name} 기본 이미지`}
        />
        <div>
          <h2 id={`room-${room.id}`} className="text-xl font-bold">
            {room.name}
          </h2>
          <p>수용 인원: {room.capacity}명</p>
          <p>위치: {room.location}</p>
        </div>
      </div>
      <div className="mt-4">
        <ReservationTimetable reservations={room.reservations} />
        <div className="sm:hidden">
          <ReservationTextList reservations={room.reservations} />
        </div>
      </div>
      {isUpdateAvailable
        ? room.reservations
            .filter((reservation) => reservation.canEdit === true)
            .map((reservation) => (
              <button
                key={reservation.id}
                className="mt-3 mr-3 rounded border border-(--color-border) px-4 py-2"
                type="button"
                aria-label={`예약 수정: ${reservation.title}`}
                onClick={(event) => onEdit(room, reservation, event.currentTarget)}
              >
                예약 수정
              </button>
            ))
        : null}
      <button
        className="mt-4 rounded bg-(--color-primary) px-4 py-2 text-white"
        type="button"
        onClick={(event) => onReserve(room, event.currentTarget)}
      >
        {isSubmissionAvailable ? `${room.name} 예약하기` : '인증 연동 대기 중'}
      </button>
    </article>
  )
}

export function MeetingRoomPage({ gateway, initialDate }: MeetingRoomPageProps) {
  const date = initialDate ?? defaultDate
  const [search, setSearch] = useState<SearchForm>(() => initialSearch(date))
  const [submittedSearch, setSubmittedSearch] = useState<SearchForm>(() => initialSearch(date))
  const [searchErrors, setSearchErrors] = useState<SearchFormErrors>({})
  const [lastValidResponse, setLastValidResponse] = useState<RoomAvailabilityResponse | undefined>(
    undefined,
  )
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary>()
  const [reservationPanelInstance, setReservationPanelInstance] = useState(0)
  const [selectedUpdate, setSelectedUpdate] = useState<{
    room: RoomSummary
    reservation: EditableRoomReservation
  }>()
  const [editError, setEditError] = useState<string>()
  const reserveTriggerRef = useRef<HTMLButtonElement | undefined>(undefined)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['meeting-room', submittedSearch],
    queryFn: async () => {
      const response = await gateway.findAvailability(toQuery(submittedSearch))
      setLastValidResponse(response)
      return response
    },
    placeholderData: (previousData) => previousData,
    retry: false,
  })
  const pendingAuthentication =
    isMeetingRoomGatewayError(query.error) && query.error.code === 'AUTH_INTEGRATION_PENDING'
  const visibleRooms = query.data?.rooms ?? lastValidResponse?.rooms

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validateMeetingTimes(search.startTime, search.endTime)
    setSearchErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }
    setSubmittedSearch(search)
  }

  function closeReservationPanel() {
    setSelectedRoom(undefined)
    setSelectedUpdate(undefined)
    requestAnimationFrame(() => reserveTriggerRef.current?.focus())
  }

  async function openReservationForEdit(
    room: RoomSummary,
    reservationId: number,
    trigger: HTMLButtonElement,
  ) {
    reserveTriggerRef.current = trigger
    setEditError(undefined)
    if (!gateway.getReservationForEdit) {
      setEditError('인증 연동이 준비 중이어서 예약을 수정할 수 없습니다.')
      return
    }
    try {
      const reservation = await gateway.getReservationForEdit(reservationId)
      if (!reservation.canEdit) {
        setEditError('이 예약을 수정할 권한이 없습니다.')
        return
      }
      setSelectedUpdate({ room, reservation })
    } catch (error) {
      setEditError(
        isMeetingRoomGatewayError(error) && error.code === 'ROOM_RESERVATION_NOT_FOUND'
          ? '이 예약을 수정할 권한이 없거나 더 이상 사용할 수 없습니다.'
          : '예약 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  function valuesForUpdate(reservation: EditableRoomReservation): ReservationFormValues {
    return {
      title: reservation.title,
      date: reservation.startAt.slice(0, 10),
      startTime: reservation.startAt.slice(11, 16),
      endTime: reservation.endAt.slice(11, 16),
      attendeeIds: reservation.attendeeIds,
      description: reservation.description,
    }
  }

  return (
    <div id="meeting-room" className="mx-auto max-w-6xl text-(--color-text-primary)">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">회의실 예약 현황</h1>
        <p className="mt-2 text-(--color-text-secondary)">
          선택한 시간대의 예약 가능 여부와 수용 인원에 맞는 회의실을 확인할 수 있습니다.
        </p>
      </div>
      <form
        className="mb-6 grid gap-3 rounded-xl bg-(--color-surface) p-4 shadow-sm sm:grid-cols-5"
        onSubmit={submit}
        noValidate
      >
        <label>
          수용 인원
          <input
            className="mt-1 w-full rounded border border-(--color-border) p-2"
            type="number"
            min="1"
            value={search.minimumCapacity}
            onChange={(event) => setSearch({ ...search, minimumCapacity: event.target.value })}
          />
        </label>
        <label>
          날짜
          <input
            className="mt-1 w-full rounded border border-(--color-border) p-2"
            type="date"
            required
            value={search.date}
            onChange={(event) => setSearch({ ...search, date: event.target.value })}
          />
        </label>
        <label>
          시작 시간
          <input
            className="mt-1 w-full rounded border border-(--color-border) p-2"
            type="time"
            min="09:00"
            max="18:00"
            step={TIME_INPUT_STEP_SECONDS}
            value={search.startTime}
            onChange={(event) => setSearch({ ...search, startTime: event.target.value })}
            aria-invalid={Boolean(searchErrors.startTime)}
            aria-describedby={searchErrors.startTime ? 'search-start-time-error' : undefined}
          />
        </label>
        {searchErrors.startTime ? (
          <p id="search-start-time-error" role="alert">
            {searchErrors.startTime}
          </p>
        ) : null}
        <label>
          종료 시간
          <input
            className="mt-1 w-full rounded border border-(--color-border) p-2"
            type="time"
            min="09:00"
            max="18:00"
            step={TIME_INPUT_STEP_SECONDS}
            value={search.endTime}
            onChange={(event) => setSearch({ ...search, endTime: event.target.value })}
            aria-invalid={Boolean(searchErrors.endTime)}
            aria-describedby={searchErrors.endTime ? 'search-end-time-error' : undefined}
          />
        </label>
        {searchErrors.endTime ? (
          <p id="search-end-time-error" role="alert">
            {searchErrors.endTime}
          </p>
        ) : null}
        <label>
          예약 상태
          <select
            className="mt-1 w-full rounded border border-(--color-border) p-2"
            value={search.availabilityStatus}
            onChange={(event) =>
              setSearch({
                ...search,
                availabilityStatus: event.target.value as SearchForm['availabilityStatus'],
              })
            }
          >
            <option value="">전체</option>
            {ROOM_AVAILABILITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ROOM_AVAILABILITY_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded bg-(--color-primary) px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) sm:col-span-5"
          type="submit"
        >
          검색 적용
        </button>
      </form>
      {query.isLoading ? (
        <p aria-live="polite" role="status">
          회의실 정보를 불러오는 중입니다.
        </p>
      ) : null}
      {pendingAuthentication ? (
        <p role="alert">
          인증 연동이 준비 중입니다. 로그인 연동 후 회의실 정보를 확인할 수 있습니다.
        </p>
      ) : null}
      {query.isError && !pendingAuthentication ? (
        <div role="alert" className="mb-4 rounded border border-(--color-danger) p-4">
          <p>회의실 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            className="mt-3 rounded bg-(--color-primary) px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
            type="button"
            onClick={() => {
              void query.refetch()
            }}
          >
            다시 시도
          </button>
        </div>
      ) : null}
      {editError ? (
        <p className="mb-4" role="alert">
          {editError}
        </p>
      ) : null}
      {visibleRooms?.length === 0 ? (
        <p>조회된 회의실이 없습니다. 검색 조건을 바꿔 다시 시도해 주세요.</p>
      ) : null}
      {visibleRooms?.length ? (
        <section className="space-y-4" aria-label="회의실 목록">
          {visibleRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isSubmissionAvailable={gateway.isReservationCreationAvailable === true}
              isUpdateAvailable={gateway.isReservationUpdateAvailable === true}
              onReserve={(selected, trigger) => {
                reserveTriggerRef.current = trigger
                setReservationPanelInstance((instance) => instance + 1)
                setSelectedRoom(selected)
              }}
              onEdit={(room, reservation, trigger) => {
                void openReservationForEdit(room, reservation.id, trigger)
              }}
            />
          ))}
        </section>
      ) : null}
      {selectedUpdate ? (
        <ReservationPanel
          room={selectedUpdate.room}
          initialDate={submittedSearch.date}
          initialValues={valuesForUpdate(selectedUpdate.reservation)}
          panelTitle={selectedUpdate.reservation.title}
          mode="update"
          isSubmissionAvailable={gateway.isReservationUpdateAvailable === true}
          onClose={closeReservationPanel}
          onSubmit={async (command) => {
            if (!gateway.updateReservation) {
              throw new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')
            }
            await gateway.updateReservation({
              reservationId: selectedUpdate.reservation.reservationId,
              ...command,
            })
            await queryClient.invalidateQueries({
              queryKey: ['meeting-room', submittedSearch],
              exact: true,
            })
          }}
          onRefreshAvailability={() => {
            void query.refetch()
          }}
        />
      ) : null}
      {selectedRoom ? (
        <ReservationPanel
          key={reservationPanelInstance}
          room={selectedRoom}
          initialDate={submittedSearch.date}
          initialValues={initialReservationValuesFromSearch(submittedSearch)}
          isSubmissionAvailable={gateway.isReservationCreationAvailable === true}
          onClose={closeReservationPanel}
          onSubmit={async (command) => {
            if (!gateway.createReservation) {
              throw new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')
            }
            await gateway.createReservation(command)
            await queryClient.invalidateQueries({
              queryKey: ['meeting-room', submittedSearch],
              exact: true,
            })
          }}
          onRefreshAvailability={() => {
            void query.refetch()
          }}
        />
      ) : null}
    </div>
  )
}
