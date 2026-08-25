import { useRef } from 'react'

import {
  ConfirmationDialog,
  confirmationDangerActionClass,
  confirmationSecondaryActionClass,
} from '../../../../shared/ui/ConfirmationDialog'

import type { ScheduleDetail } from '../../api/scheduleCalendarApi'

export function ScheduleCancellationDialog({
  detail,
  isPending,
  onDismiss,
  onConfirm,
}: {
  detail: ScheduleDetail
  isPending: boolean
  onDismiss: () => void
  onConfirm: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const roomManaged = detail.meetingRoomManaged
  return (
    <ConfirmationDialog
      closeButtonRef={closeRef}
      description={
        roomManaged
          ? '취소한 예약과 연결된 일정이 함께 취소되어 캘린더와 회의실 예약 현황에서 사라집니다.'
          : '취소한 일정은 캘린더와 상세에서 사라집니다.'
      }
      footer={
        <>
          <button
            className={confirmationSecondaryActionClass}
            disabled={isPending}
            onClick={onDismiss}
            type="button"
          >
            {roomManaged ? '계속 예약 보기' : '계속 일정 보기'}
          </button>
          <button
            className={confirmationDangerActionClass}
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending
              ? roomManaged
                ? '예약 취소 중'
                : '일정 취소 중'
              : roomManaged
                ? '예약 취소 확정'
                : '일정 취소 확정'}
          </button>
        </>
      }
      isCloseDisabled={isPending}
      onDismiss={onDismiss}
      title={`${detail.title}${roomManaged ? ' 예약' : ''} 취소`}
      titleId="cancel-title"
    />
  )
}
