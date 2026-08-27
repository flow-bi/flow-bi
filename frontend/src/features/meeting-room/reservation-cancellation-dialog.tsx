import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'

interface ReservationCancellationDialogProps {
  roomName: string
  reservation: { title: string; startAt: string; endAt: string }
  trigger?: HTMLButtonElement
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
  trigger,
  isSubmitting,
  error,
  isRefreshRecommended = false,
  onClose,
  onConfirm,
  onRefresh,
}: ReservationCancellationDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  const closeAndRestoreFocus = useCallback(() => {
    if (isSubmitting) {
      return
    }
    onClose()
    trigger?.focus()
  }, [isSubmitting, onClose, trigger])

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSubmitting) {
        return
      }
      event.preventDefault()
      closeAndRestoreFocus()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [closeAndRestoreFocus, isSubmitting])

  function keepFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab' || isSubmitting) {
      return
    }
    const actions = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
    )
    const firstAction = actions.at(0)
    const lastAction = actions.at(-1)
    if (!firstAction || !lastAction) {
      return
    }
    if (event.shiftKey && document.activeElement === firstAction) {
      event.preventDefault()
      lastAction.focus()
    } else if (!event.shiftKey && document.activeElement === lastAction) {
      event.preventDefault()
      firstAction.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4"
      role="presentation"
    >
      <section
        className="w-full max-w-md rounded-xl bg-(--color-surface) p-5 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reservation-cancellation-title"
        onKeyDown={keepFocus}
      >
        <h2 id="reservation-cancellation-title" className="text-xl font-bold">
          {reservation.title} 예약 취소 확인
        </h2>
        <p className="mt-3">이 작업은 되돌릴 수 없습니다. 예약과 연결 일정이 함께 취소됩니다.</p>
        <dl className="mt-3 space-y-1">
          <div>
            <dt className="inline font-semibold">회의실: </dt>
            <dd className="inline">{roomName}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">시간: </dt>
            <dd className="inline">
              {reservation.startAt.slice(11, 16)}–{reservation.endAt.slice(11, 16)}
            </dd>
          </div>
        </dl>
        {error ? (
          <p className="mt-3" role="alert">
            {error}
          </p>
        ) : null}
        {isRefreshRecommended && onRefresh ? (
          <button
            type="button"
            className="mt-3 rounded border border-(--color-border) px-4 py-2"
            onClick={onRefresh}
            disabled={isSubmitting}
          >
            최신 예약 현황 조회
          </button>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded border border-(--color-border) px-4 py-2"
            onClick={closeAndRestoreFocus}
            disabled={isSubmitting}
          >
            닫기
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-60"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '예약 취소 중' : '예약 취소 실행'}
          </button>
        </div>
      </section>
    </div>
  )
}
