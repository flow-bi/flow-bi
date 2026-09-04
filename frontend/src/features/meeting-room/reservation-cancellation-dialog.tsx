import { useRef } from 'react'

import {
  ConfirmationDialog,
  confirmationDangerActionClass,
  confirmationSecondaryActionClass,
} from '../../shared/ui/ConfirmationDialog'

interface ReservationCancellationDialogProps {
  roomName: string
  reservation: { title: string; startAt: string; endAt: string }
  isSubmitting: boolean
  error?: string
  isRefreshRecommended?: boolean
  onClose: () => void
  onConfirm: () => void
  onRefresh?: () => void
}

export function ReservationCancellationDialog({
  roomName,
  reservation,
  isSubmitting,
  error,
  isRefreshRecommended = false,
  onClose,
  onConfirm,
  onRefresh,
}: ReservationCancellationDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <ConfirmationDialog
      title={`${reservation.title} 예약 취소 확인`}
      description={
        <>
          <p>이 작업은 되돌릴 수 없습니다. 예약과 연결 일정이 함께 취소됩니다.</p>
          <p className="mt-3">
            <strong>회의실:</strong> {roomName}
            <br />
            <strong>시간:</strong> {reservation.startAt.slice(11, 16)}–
            {reservation.endAt.slice(11, 16)}
          </p>
          {error ? (
            <p className="mt-3" role="alert">
              {error}
            </p>
          ) : null}
        </>
      }
      footer={
        <>
          {isRefreshRecommended && onRefresh ? (
            <button
              className={confirmationSecondaryActionClass}
              disabled={isSubmitting}
              onClick={onRefresh}
              type="button"
            >
              최신 예약 현황 조회
            </button>
          ) : null}
          <button
            className={confirmationDangerActionClass}
            disabled={isSubmitting}
            onClick={onConfirm}
            ref={confirmButtonRef}
            type="button"
          >
            {isSubmitting ? '예약 취소 중' : '예약 취소 실행'}
          </button>
        </>
      }
      initialFocusRef={confirmButtonRef}
      isCloseDisabled={isSubmitting}
      onDismiss={onClose}
    />
  )
}
