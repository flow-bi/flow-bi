import { useMemo, useState } from 'react'

import { StatusBadge } from '../../../../shared/components/StatusBadge'
import { TimeGrid } from '../../../../shared/components/TimeGrid'
import { ReservationDetailPanel } from '../../reservation/components/ReservationDetailPanel'
import { ReservationPanel } from '../../reservation/components/ReservationPanel'
import { ReservationBlock } from '../../status-board/components/ReservationBlock'
import { useRoomReservationMap, useRooms } from '../hooks'

import type { Reservation, Room } from '../types'

const today = toLocalDateInputValue(new Date())

export function MeetingRoomPage() {
  const [date, setDate] = useState(today)
  const [capacity, setCapacity] = useState('')
  const [timeRange, setTimeRange] = useState('')
  const [status, setStatus] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const roomsQuery = useRooms({ capacity, date, timeRange, status })
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data])
  const roomIds = useMemo(
    () => Array.from(new Set(rooms.map((room) => room.roomId).filter((roomId) => roomId > 0))),
    [rooms],
  )
  const reservationMapQuery = useRoomReservationMap(roomIds, date)
  const roomsWithReservations = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        reservations:
          reservationMapQuery.reservationsByRoomId.get(room.roomId) ?? room.reservations,
      })),
    [reservationMapQuery.reservationsByRoomId, rooms],
  )
  const activeRoom =
    roomsWithReservations.find((room) => room.roomId === selectedRoom?.roomId) ??
    roomsWithReservations[0] ??
    null

  const rows = useMemo(
    () =>
      roomsWithReservations.map((room) => ({
        id: room.roomId,
        header: (
          <button
            className={`block w-full rounded-md border px-3 py-2 text-left ${
              activeRoom?.roomId === room.roomId
                ? 'border-[var(--color-accent-soft)]'
                : 'border-transparent'
            }`}
            type="button"
            onClick={() => {
              setSelectedRoom(room)
              setSelectedReservation(null)
              setIsModalOpen(true)
            }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {room.roomName}
              </span>
              <StatusBadge
                tone="success"
                label={`${room.reservations.filter((item) => item.status === 'RESERVED').length}건`}
              />
            </span>
            <span className="mt-2 block text-xs text-[var(--color-text-muted)]">
              {room.location ?? '위치 미지정'} · {room.capacity ?? '-'}명
            </span>
            <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
              {room.field ?? '장비 미지정'}
            </span>
          </button>
        ),
        content: (
          <>
            {room.reservations.map((reservation) => (
              <ReservationBlock
                key={reservation.reservationId}
                reservation={reservation}
                onSelect={(item) => {
                  setSelectedRoom(room)
                  setSelectedReservation(item)
                  setIsDetailOpen(true)
                }}
              />
            ))}
          </>
        ),
      })),
    [activeRoom?.roomId, roomsWithReservations],
  )

  return (
    <section className="min-h-full space-y-6 bg-[var(--color-bg)] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">회의실</h1>
        </div>
        <button
          className="h-10 rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
          type="button"
          onClick={() => {
            setSelectedRoom(activeRoom)
            setSelectedReservation(null)
            setIsModalOpen(true)
          }}
        >
          예약하기
        </button>
      </div>

      <div className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-[1fr_1fr_1fr_1fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold">날짜</span>
          <input
            className="form-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">수용 인원</span>
          <input
            className="form-input"
            min={1}
            placeholder="예: 6"
            type="number"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">시간대</span>
          <select
            className="form-input"
            value={timeRange}
            onChange={(event) => setTimeRange(event.target.value)}
          >
            <option value="">전체</option>
            <option value="09:00-10:00">09:00-10:00</option>
            <option value="10:00-11:00">10:00-11:00</option>
            <option value="11:00-12:00">11:00-12:00</option>
            <option value="13:00-14:00">13:00-14:00</option>
            <option value="14:00-15:00">14:00-15:00</option>
            <option value="15:00-16:00">15:00-16:00</option>
            <option value="16:00-17:00">16:00-17:00</option>
            <option value="17:00-18:00">17:00-18:00</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">상태</span>
          <select
            className="form-input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">전체</option>
            <option value="RESERVED">예약완료</option>
            <option value="PENDING">승인대기</option>
            <option value="CANCELLED">취소됨</option>
          </select>
        </label>
      </div>

      {roomsQuery.isPending ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
          회의실 정보를 불러오는 중입니다.
        </div>
      ) : null}

      {roomsQuery.isError ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-danger)]">
          회의실 정보를 불러오지 못했습니다.
        </div>
      ) : null}

      {reservationMapQuery.isError ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-danger)]">
          예약 현황을 불러오지 못했습니다.
        </div>
      ) : null}

      {!roomsQuery.isPending && !roomsQuery.isError && !reservationMapQuery.isError ? (
        <TimeGrid rows={rows} />
      ) : null}

      <ReservationPanel
        key={`${selectedRoom?.roomId ?? activeRoom?.roomId ?? 0}-${selectedReservation?.reservationId ?? 'new'}-${isModalOpen ? 'open' : 'closed'}`}
        rooms={roomsWithReservations}
        initialRoom={selectedRoom ?? activeRoom}
        date={date}
        reservation={selectedReservation}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedReservation(null)
        }}
      />
      <ReservationDetailPanel
        room={selectedRoom}
        reservation={selectedReservation}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedReservation(null)
        }}
        onEdit={() => {
          setIsDetailOpen(false)
          setIsModalOpen(true)
        }}
      />
    </section>
  )
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
