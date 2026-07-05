import { useMemo, useState } from 'react'

import { StatusBadge } from '../../../../shared/components/StatusBadge'
import { TimeGrid } from '../../../../shared/components/TimeGrid'
import { ReservationPanel } from '../../reservation/components/ReservationPanel'
import { ReservationBlock } from '../../status-board/components/ReservationBlock'
import { useRooms } from '../hooks'

import type { Reservation, ReservationStatus, Room } from '../types'

const today = new Date().toISOString().slice(0, 10)

const statusLabels: Record<ReservationStatus, string> = {
  PENDING: '승인대기',
  RESERVED: '예약완료',
  CANCELLED: '취소됨',
}

export function MeetingRoomPage() {
  const [date, setDate] = useState(today)
  const [capacity, setCapacity] = useState('')
  const [timeRange, setTimeRange] = useState('')
  const [status, setStatus] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const roomsQuery = useRooms({ capacity, date, timeRange, status })
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data])
  const activeRoom = selectedRoom ?? rooms[0] ?? null

  const rows = useMemo(
    () =>
      rooms.map((room) => ({
        id: room.roomId,
        label: room.roomName,
        meta: `${room.location ?? '위치 미지정'} · ${room.capacity ?? '-'}명`,
        content: (
          <>
            {room.reservations.map((reservation) => (
              <ReservationBlock
                key={reservation.reservationId}
                reservation={reservation}
                onSelect={(item) => {
                  setSelectedRoom(room)
                  setSelectedReservation(item)
                  setIsPanelOpen(true)
                }}
              />
            ))}
          </>
        ),
      })),
    [rooms],
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
            setIsPanelOpen(true)
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

      {!roomsQuery.isPending && !roomsQuery.isError ? (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {rooms.map((room) => (
              <button
                key={room.roomId}
                className={`w-full rounded-md border bg-[var(--color-surface)] p-4 text-left ${
                  activeRoom?.roomId === room.roomId
                    ? 'border-[var(--color-primary)]'
                    : 'border-[var(--color-border)]'
                }`}
                type="button"
                onClick={() => setSelectedRoom(room)}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{room.roomName}</p>
                  <StatusBadge
                    tone="success"
                    label={`${room.reservations.filter((item) => item.status === 'RESERVED').length}건`}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {room.location ?? '위치 미지정'} · {room.capacity ?? '-'}명
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {room.field ?? '장비 미지정'}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <TimeGrid rows={rows} />
            {activeRoom ? (
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {activeRoom.roomName} 예약
                </p>
                <div className="mt-3 space-y-2">
                  {activeRoom.reservations.length > 0 ? (
                    activeRoom.reservations.map((reservation) => (
                      <button
                        key={reservation.reservationId}
                        className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--color-border)] px-3 py-2 text-left"
                        type="button"
                        onClick={() => {
                          setSelectedReservation(reservation)
                          setIsPanelOpen(true)
                        }}
                      >
                        <span>
                          <span className="block text-sm font-semibold">{reservation.title}</span>
                          <span className="block text-xs text-[var(--color-text-muted)]">
                            {reservation.startAt.slice(11, 16)}-{reservation.endAt.slice(11, 16)} ·{' '}
                            {reservation.teamName ?? '팀 미지정'}
                          </span>
                        </span>
                        <StatusBadge
                          tone={
                            reservation.status === 'RESERVED'
                              ? 'success'
                              : reservation.status === 'PENDING'
                                ? 'warning'
                                : 'muted'
                          }
                          label={statusLabels[reservation.status]}
                        />
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      선택한 날짜에 예약이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ReservationPanel
        room={selectedRoom ?? activeRoom}
        date={date}
        reservation={selectedReservation}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
          setSelectedReservation(null)
        }}
      />
    </section>
  )
}
