import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { meetingRoomQueryKey, useRoomAvailability } from './meeting-room-availability'
import {
  type EditableRoomReservation,
  MeetingRoomGatewayError,
  isMeetingRoomGatewayError,
  type MeetingRoomGateway,
  type RoomAvailabilityStatus,
  type RoomSummary,
} from './meeting-room-gateway'
import { RoomAvailabilityList } from './meeting-room-list'
import {
  invalidateCreatedReservationQueries,
  invalidateUpdatedReservationQueries,
} from './meeting-room-query-invalidation'
import { RoomAvailabilitySearch } from './meeting-room-search'
import { useReservationCancellation } from './reservation-cancellation'
import { ReservationCancellationDialog } from './reservation-cancellation-dialog'
import {
  initialReservationValuesFromSearch,
  type ReservationFormValues,
} from './reservation-form-schema'
import { ReservationPanel } from './reservation-panel'

interface MeetingRoomPageProps {
  gateway: MeetingRoomGateway
  initialDate?: string
}

const defaultDate = new Date().toISOString().slice(0, 10)

export function MeetingRoomPage({ gateway, initialDate }: MeetingRoomPageProps) {
  const date = initialDate ?? defaultDate
  const [submittedSearch, setSubmittedSearch] = useState({
    minimumCapacity: '',
    date,
    startTime: '09:00',
    endTime: '18:00',
    availabilityStatus: '' as '' | RoomAvailabilityStatus,
  })
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary>()
  const [reservationPanelInstance, setReservationPanelInstance] = useState(0)
  const [selectedUpdate, setSelectedUpdate] = useState<{
    room: RoomSummary
    reservation: EditableRoomReservation
  }>()
  const [editError, setEditError] = useState<string>()
  const [cancellationNotice, setCancellationNotice] = useState<string>()
  const reserveTriggerRef = useRef<HTMLButtonElement | undefined>(undefined)
  const cancellationAdjacentFocusRoomIdRef = useRef<number | undefined>(undefined)
  const queryClient = useQueryClient()
  const query = useRoomAvailability(
    gateway,
    {
      date: submittedSearch.date,
      startTime: submittedSearch.startTime,
      endTime: submittedSearch.endTime,
      ...(submittedSearch.minimumCapacity === ''
        ? {}
        : { minimumCapacity: Number(submittedSearch.minimumCapacity) }),
      ...(submittedSearch.availabilityStatus === ''
        ? {}
        : { availabilityStatus: submittedSearch.availabilityStatus }),
    },
    submittedSearch,
  )
  const pendingAuthentication =
    isMeetingRoomGatewayError(query.error) && query.error.code === 'AUTH_INTEGRATION_PENDING'
  const visibleRooms = query.rooms
  const findAttendeeCandidates = (attendeeQuery: string) =>
    gateway.findAttendeeCandidates?.(attendeeQuery) ?? Promise.resolve([])
  const cancellation = useReservationCancellation({
    cancelReservation: gateway.cancelReservation,
    queryClient,
    roomQueryKey: [...meetingRoomQueryKey, submittedSearch],
    onSuccess: () => {
      cancellationAdjacentFocusRoomIdRef.current = cancellation.target?.roomId
      setCancellationNotice('예약과 연결 일정이 취소되어 기본 화면에서 사라졌습니다.')
    },
  })

  function closeReservationPanel() {
    setSelectedRoom(undefined)
    setSelectedUpdate(undefined)
    requestAnimationFrame(() => reserveTriggerRef.current?.focus())
  }

  useEffect(() => {
    const roomId = cancellationAdjacentFocusRoomIdRef.current
    if (cancellation.target || cancellation.isSubmitting || roomId === undefined) {
      return
    }
    const focusAdjacentAction = () => document.getElementById(`room-reserve-${roomId}`)?.focus()
    focusAdjacentAction()
    const timer = window.setTimeout(() => {
      focusAdjacentAction()
      cancellationAdjacentFocusRoomIdRef.current = undefined
    }, 50)
    return () => window.clearTimeout(timer)
  })

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
      creatorAttends: reservation.creatorAttends ?? false,
      attendeeIds: reservation.attendeeIds,
      attendees: reservation.attendees,
      description: reservation.description,
    }
  }

  async function refreshCancellationAvailability() {
    if (!cancellation.target || cancellation.isSubmitting) {
      return
    }
    const result = await query.refetch()
    if (result.error) {
      return
    }
    cancellationAdjacentFocusRoomIdRef.current = cancellation.target.roomId
    cancellation.close()
  }

  return (
    <div id="meeting-room" className="mx-auto max-w-6xl text-(--color-text-primary)">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">회의실 예약 현황</h1>
        <p className="mt-2 text-(--color-text-secondary)">
          선택한 시간대의 예약 가능 여부와 수용 인원에 맞는 회의실을 확인할 수 있습니다.
        </p>
      </div>
      <RoomAvailabilitySearch
        initialDate={date}
        onApply={(search) =>
          setSubmittedSearch({
            minimumCapacity: search.minimumCapacity?.toString() ?? '',
            date: search.date,
            startTime: search.startTime ?? '09:00',
            endTime: search.endTime ?? '18:00',
            availabilityStatus: search.availabilityStatus ?? '',
          })
        }
      />
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
      {cancellationNotice ? (
        <p className="mb-4" role="status">
          {cancellationNotice}
        </p>
      ) : null}
      {visibleRooms?.length === 0 ? (
        <p>조회된 회의실이 없습니다. 검색 조건을 바꿔 다시 시도해 주세요.</p>
      ) : null}
      {visibleRooms?.length ? (
        <RoomAvailabilityList
          rooms={visibleRooms}
          onReserve={(selected, trigger) => {
            reserveTriggerRef.current = trigger
            setReservationPanelInstance((instance) => instance + 1)
            setSelectedRoom(selected)
          }}
          onEdit={(room, reservation, trigger) => {
            void openReservationForEdit(room, reservation.id, trigger)
          }}
          onCancel={(room, reservation, trigger) => {
            reserveTriggerRef.current = trigger
            setCancellationNotice(undefined)
            cancellation.open(reservation, room.id)
          }}
        />
      ) : null}
      {selectedUpdate ? (
        <ReservationPanel
          key={selectedUpdate.reservation.reservationId}
          room={selectedUpdate.room}
          initialDate={submittedSearch.date}
          initialValues={valuesForUpdate(selectedUpdate.reservation)}
          panelTitle={selectedUpdate.reservation.title}
          mode="update"
          onClose={closeReservationPanel}
          onSubmit={async (command) => {
            if (!gateway.updateReservation) {
              throw new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')
            }
            await gateway.updateReservation({
              reservationId: selectedUpdate.reservation.reservationId,
              ...command,
            })
            await invalidateUpdatedReservationQueries(queryClient, [
              ...meetingRoomQueryKey,
              submittedSearch,
            ])
          }}
          onRefreshAvailability={() => {
            void query.refetch()
          }}
          onFindAttendeeCandidates={findAttendeeCandidates}
        />
      ) : null}
      {selectedRoom ? (
        <ReservationPanel
          key={reservationPanelInstance}
          room={selectedRoom}
          initialDate={submittedSearch.date}
          initialValues={initialReservationValuesFromSearch({
            date: submittedSearch.date,
            startTime: submittedSearch.startTime ?? '09:00',
            endTime: submittedSearch.endTime ?? '18:00',
          })}
          onClose={closeReservationPanel}
          onSubmit={async (command) => {
            if (!gateway.createReservation) {
              throw new MeetingRoomGatewayError('AUTH_INTEGRATION_PENDING')
            }
            await gateway.createReservation(command)
            await invalidateCreatedReservationQueries(queryClient, [
              ...meetingRoomQueryKey,
              submittedSearch,
            ])
          }}
          onRefreshAvailability={() => {
            void query.refetch()
          }}
          onFindAttendeeCandidates={findAttendeeCandidates}
        />
      ) : null}
      {cancellation.target ? (
        <ReservationCancellationDialog
          roomName={
            visibleRooms?.find((room) => room.id === cancellation.target?.roomId)?.name ?? ''
          }
          reservation={{
            title: cancellation.target.reservation.title,
            startAt: cancellation.target.reservation.startAt ?? '',
            endAt: cancellation.target.reservation.endAt ?? '',
          }}
          isSubmitting={cancellation.isSubmitting}
          error={cancellation.error}
          isRefreshRecommended={cancellation.isRefreshRecommended}
          onClose={cancellation.close}
          onConfirm={() => void cancellation.confirm()}
          onRefresh={() => void refreshCancellationAvailability()}
        />
      ) : null}
    </div>
  )
}
