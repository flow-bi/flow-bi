import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface ReservationPanelShellProps {
  title: string
  isDirty: boolean
  onClose: () => void
  children: ReactNode
}

export function ReservationPanelShell({
  title,
  isDirty,
  onClose,
  children,
}: ReservationPanelShellProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }, [isDirty, onClose])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose])

  return (
    <div
      className="fixed inset-0 z-10 flex justify-end bg-black/30"
      role="presentation"
      data-testid="reservation-panel-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          requestClose()
        }
      }}
    >
      <section
        className="h-full w-full overflow-y-auto bg-(--color-surface) p-5 shadow-xl sm:max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-panel-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            ref={headingRef}
            id="reservation-panel-title"
            tabIndex={-1}
            className="text-2xl font-bold outline-none"
          >
            {title}
          </h2>
          <button
            type="button"
            className="rounded border border-(--color-border) px-3 py-1"
            onClick={requestClose}
          >
            닫기
          </button>
        </div>
        {children}
        {confirmDiscard ? (
          <div
            className="mt-4 rounded border border-(--color-warning) p-3"
            role="alertdialog"
            aria-label="입력 내용 삭제 확인"
          >
            <p>저장하지 않은 입력 내용이 있습니다.</p>
            <button
              className="mt-2 rounded bg-(--color-danger) px-3 py-1 text-white"
              type="button"
              onClick={onClose}
            >
              입력 내용 삭제
            </button>
            <button
              className="ml-2 rounded border border-(--color-border) px-3 py-1"
              type="button"
              onClick={() => setConfirmDiscard(false)}
            >
              계속 입력
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
