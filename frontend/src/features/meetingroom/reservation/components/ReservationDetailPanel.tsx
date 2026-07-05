import { SidePanel } from '../../../../shared/components/SidePanel'
import { StatusBadge } from '../../../../shared/components/StatusBadge'
import { useAuthStore } from '../../../auth/store'
import { useCancelReservation } from '../../list/hooks'

import type { Reservation, Room } from '../../list/types'

type ReservationDetailPanelProps = {
  room: Room | null
  reservation: Reservation | null
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
}

export function ReservationDetailPanel({
  room,
  reservation,
  isOpen,
  onClose,
  onEdit,
}: ReservationDetailPanelProps) {
  const currentUserId = useAuthStore((state) => state.user?.userId)
  const cancelMutation = useCancelReservation()
  const canManage =
    reservation?.creatorId !== undefined && currentUserId !== undefined
      ? reservation.creatorId === currentUserId
      : false

  return (
    <SidePanel title="예약 상세" isOpen={isOpen} onClose={onClose}>
      {reservation ? (
        <div className="space-y-5">
          <div className="rounded-md border border-[var(--color-border)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[18px] font-semibold text-[var(--color-text)]">
                  {reservation.title}
                </p>
                <p className="mt-1 text-xs tabular-nums text-[var(--color-text-muted)]">
                  {reservation.startAt.slice(0, 10)} · {reservation.startAt.slice(11, 16)}-
                  {reservation.endAt.slice(11, 16)}
                </p>
              </div>
              <StatusBadge
                tone={
                  reservation.status === 'RESERVED'
                    ? 'success'
                    : reservation.status === 'PENDING'
                      ? 'warning'
                      : 'muted'
                }
                label={
                  reservation.status === 'RESERVED'
                    ? '예약완료'
                    : reservation.status === 'PENDING'
                      ? '승인대기'
                      : '취소됨'
                }
              />
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <DetailItem label="회의실" value={room?.roomName ?? '회의실 미지정'} />
            <DetailItem
              label="위치/장비"
              value={`${room?.location ?? '위치 미지정'} · ${room?.field ?? '장비 미지정'}`}
            />
            <DetailItem label="참석자" value={`예상 ${reservation.count ?? '-'}명`} />
            <DetailItem
              label="예약자/팀"
              value={`${reservation.creatorName ?? '예약자 미지정'} · ${
                reservation.teamName ?? '팀 미지정'
              }`}
            />
            <DetailItem label="상세 설명" value={reservation.field ?? '상세 설명 없음'} />
          </dl>

          {canManage ? (
            <div className="flex gap-2 border-t border-[var(--color-border)] pt-4">
              <button
                className="h-10 flex-1 rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text)]"
                type="button"
                onClick={onEdit}
              >
                수정
              </button>
              <button
                className="h-10 flex-1 rounded-md border border-[var(--color-danger)] px-4 text-sm font-semibold text-[var(--color-danger)] disabled:opacity-60"
                disabled={cancelMutation.isPending}
                type="button"
                onClick={() =>
                  cancelMutation.mutate(reservation.reservationId, { onSuccess: onClose })
                }
              >
                삭제
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">선택된 예약이 없습니다.</p>
      )}
    </SidePanel>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-[var(--color-text)]">{value}</dd>
    </div>
  )
}
