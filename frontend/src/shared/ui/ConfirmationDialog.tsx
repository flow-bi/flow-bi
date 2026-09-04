import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'

const closeButtonClass =
  'absolute top-4 right-4 rounded p-1 text-text-secondary transition hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export const confirmationSecondaryActionClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-text-primary transition hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'

export const confirmationDangerActionClass =
  'w-full rounded-lg border border-red-700 bg-red-700 px-3 py-2 font-semibold text-white transition hover:bg-red-800 focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70 sm:w-auto'

export interface ConfirmationDialogProps {
  title: ReactNode
  description: ReactNode
  footer: ReactNode
  onDismiss: () => void
  closeButtonRef?: RefObject<HTMLButtonElement | null>
  initialFocusRef?: RefObject<HTMLButtonElement | null>
  isCloseDisabled?: boolean
  titleId?: string
  descriptionId?: string
}

export function ConfirmationDialog({
  title,
  description,
  footer,
  onDismiss,
  closeButtonRef,
  initialFocusRef,
  isCloseDisabled = false,
  titleId: providedTitleId,
  descriptionId: providedDescriptionId,
}: ConfirmationDialogProps) {
  const generatedTitleId = useId()
  const generatedDescriptionId = useId()
  const titleId = providedTitleId ?? generatedTitleId
  const descriptionId = providedDescriptionId ?? generatedDescriptionId
  const internalCloseButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElement = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )

  const dismiss = useCallback(() => {
    onDismiss()
    window.setTimeout(() => previouslyFocusedElement.current?.focus(), 0)
  }, [onDismiss])

  useEffect(() => {
    ;(
      initialFocusRef?.current ??
      closeButtonRef?.current ??
      internalCloseButtonRef.current
    )?.focus()
  }, [closeButtonRef, initialFocusRef])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCloseDisabled) {
        event.preventDefault()
        dismiss()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss, isCloseDisabled])

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-slate-950/55 p-4"
      data-testid="confirmation-dialog-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isCloseDisabled) {
          dismiss()
        }
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative w-full max-w-sm rounded-xl bg-surface p-6 shadow-2xl"
        data-testid="confirmation-dialog-card"
        onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
          if (event.key !== 'Tab') {
            return
          }
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
          )
          const first = buttons.at(0)
          const last = buttons.at(-1)
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        role="alertdialog"
      >
        <h2 className="m-0 pr-10 text-xl font-bold text-text-primary" id={titleId}>
          {title}
        </h2>
        <button
          aria-label="닫기"
          className={closeButtonClass}
          disabled={isCloseDisabled}
          onClick={dismiss}
          ref={closeButtonRef ?? internalCloseButtonRef}
          type="button"
        >
          ×
        </button>
        <div className="mt-3 text-text-secondary" id={descriptionId}>
          {description}
        </div>
        <footer
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end"
          data-testid="confirmation-dialog-footer"
        >
          {footer}
        </footer>
      </section>
    </div>
  )
}
