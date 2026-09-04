import { useMemo, useState } from 'react'

import {
  type CreateRoomReservationCommand,
  type RoomReservationAttendee,
  type RoomSummary,
} from './meeting-room-gateway'
import { ReservationForm } from './reservation-form'
import {
  initialReservationValuesFromSearch,
  type ReservationFormValues,
} from './reservation-form-schema'
import { ReservationPanelShell } from './reservation-panel-shell'

interface ReservationPanelProps {
  room: RoomSummary
  initialDate: string
  mode?: 'create' | 'update'
  initialValues?: ReservationFormValues
  panelTitle?: string
  onClose: () => void
  onSubmit: (command: CreateRoomReservationCommand) => Promise<void>
  onRefreshAvailability: () => void
  onFindAttendeeCandidates?: (query: string) => Promise<RoomReservationAttendee[]>
}

export function ReservationPanel({
  room,
  initialDate,
  mode = 'create',
  initialValues,
  panelTitle,
  onClose,
  onSubmit,
  onRefreshAvailability,
  onFindAttendeeCandidates,
}: ReservationPanelProps) {
  const [isDirty, setIsDirty] = useState(false)
  const defaultValues = useMemo(
    () =>
      initialValues ??
      initialReservationValuesFromSearch({
        date: initialDate,
        startTime: '09:00',
        endTime: '10:00',
      }),
    [initialDate, initialValues],
  )

  return (
    <ReservationPanelShell
      title={mode === 'update' ? `${panelTitle ?? room.name} 예약 수정` : `${room.name} 예약`}
      isDirty={isDirty}
      onClose={onClose}
    >
      <p className="mt-2">
        수용 인원: {room.capacity}명 · {room.location}
      </p>
      <ReservationForm
        roomId={room.id}
        capacity={room.capacity}
        mode={mode}
        initialValues={defaultValues}
        onSubmit={onSubmit}
        onRefreshAvailability={onRefreshAvailability}
        onFindAttendeeCandidates={onFindAttendeeCandidates}
        onDirtyChange={setIsDirty}
      />
    </ReservationPanelShell>
  )
}
