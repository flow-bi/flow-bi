import { useEffect, useRef } from 'react'

import type { PropsWithChildren } from 'react'

type ModalProps = PropsWithChildren<{
  title: string
  isOpen: boolean
  onClose: () => void
}>

export function Modal({ title, isOpen, onClose, children }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <button
        className="absolute inset-0 h-full w-full"
        type="button"
        aria-label="모달 닫기"
        onClick={onClose}
      />
      <section className="relative max-h-[calc(100vh-48px)] w-full max-w-[560px] overflow-auto rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] shadow-lg">
        <header className="flex min-h-14 items-center border-b border-[var(--color-border)] px-5">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button
            ref={closeButtonRef}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            type="button"
            aria-label="모달 닫기"
            onClick={onClose}
          >
            X
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  )
}
