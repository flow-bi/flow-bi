import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'

import {
  type EditableRoomReservation,
  MeetingRoomGatewayError,
  RESERVATION_DISPLAY_STATUSES,
  isMeetingRoomGatewayError,
  type MeetingRoomGateway,
  type ReservationDisplayStatus,
  type RoomAvailabilityQuery,
  type RoomAvailabilityResponse,
  type RoomSummary,
} from './meeting-room-gateway'
import { ReservationPanel } from './reservation-panel'
import { RESERVATION_STATUS_LABELS } from './reservation-status'
import { ReservationTextList, ReservationTimetable } from './reservation-timetable'

import type { ReservationFormValues } from './reservation-form-schema'

interface MeetingRoomPageProps {
  gateway: MeetingRoomGateway
  initialDate?: string
}

interface SearchForm {
  minimumCapacity: string
  date: string
  startTime: string
  endTime: string
  preferredReservationStatus: '' | ReservationDisplayStatus
}

const defaultImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23e5e7eb'/%3E%3Cpath d='M70 130h180V80H70zM95 80V50h130v30' fill='%239ca3af'/%3E%3C/svg%3E"
const defaultDate = new Date().toISOString().slice(0, 10)

function initialSearch(date: string): SearchForm {
  return {
    minimumCapacity: '',
    date,
    startTime: '09:00',
    endTime: '18:00',
    preferredReservationStatus: '',
  }
}

function toQuery(search: SearchForm): RoomAvailabilityQuery {
  return {
    date: search.date,
    startTime: search.startTime,
    endTime: search.endTime,
    ...(search.minimumCapacity === '' ? {} : { minimumCapacity: Number(search.minimumCapacity) }),
    ...(search.preferredReservationStatus === ''
      ? {}
      : { preferredReservationStatus: search.preferredReservationStatus }),
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
                onClick={(event) => onEdit(room, reservation, event.currentTarget)}
              >
                {reservation.title} 수정
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
  const [lastValidResponse, setLastValidResponse] = useState<RoomAvailabilityResponse | undefined>(
    undefined,
  )
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary>()
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
          검색 조건에 맞는 회의실이 먼저 표시됩니다. 모든 회의실은 계속 확인할 수 있습니다.
        </p>
      </div>
      <form
        className="mb-6 grid gap-3 rounded-xl bg-(--color-surface) p-4 shadow-sm sm:grid-cols-5"
        onSubmit={submit}
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
            value={search.startTime}
            onChange={(event) => setSearch({ ...search, startTime: event.target.value })}
          />
        </label>
        <label>
          종료 시간
          <input
            className="mt-1 w-full rounded border border-(--color-border) p-2"
            type="time"
            min="09:00"
            max="18:00"
            value={search.endTime}
            onChange={(event) => setSearch({ ...search, endTime: event.target.value })}
          />
        </label>
        <label>
          예약 상태
          <select
            className="mt-1 w-full rounded border border-(--color-border) p-2"
            value={search.preferredReservationStatus}
            onChange={(event) =>
              setSearch({
                ...search,
                preferredReservationStatus: event.target
                  .value as SearchForm['preferredReservationStatus'],
              })
            }
          >
            <option value="">전체</option>
            {RESERVATION_DISPLAY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RESERVATION_STATUS_LABELS[status]}
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
      {query.isLoading ? <p role="status">회의실 정보를 불러오는 중입니다.</p> : null}
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
            await queryClient.invalidateQueries({ queryKey: ['meeting-room'] })
          }}
          onRefreshAvailability={() => {
            void query.refetch()
          }}
        />
      ) : null}
      {selectedRoom ? (
        <ReservationPanel
          room={selectedRoom}
          initialDate={submittedSearch.date}
          isSubmissionAvailable={gateway.isReservationCreationAvailable === true}
          onClose={closeReservationPanel}
          onSubmit={async (command) => {
            if (!gateway.createReservation) {
              throw new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')
            }
            await gateway.createReservation(command)
            await queryClient.invalidateQueries({ queryKey: ['meeting-room'] })
          }}
          onRefreshAvailability={() => {
            void query.refetch()
          }}
        />
      ) : null}
    </div>
  )
}
