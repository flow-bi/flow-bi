import { useEffect, useRef } from 'react'

import type { PropsWithChildren } from 'react'

type SidePanelProps = PropsWithChildren<{
  title: string
  isOpen: boolean
  onClose: () => void
}>

export function SidePanel({ title, isOpen, onClose, children }: SidePanelProps) {
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
    <div className="fixed inset-y-0 right-0 z-40 flex">
      <button
        className="w-screen cursor-default"
        type="button"
        aria-label="우측 배너 닫기"
        onClick={onClose}
      />
      <aside className="h-full w-[min(400px,100vw)] border-l border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-lg">
        <header className="flex min-h-14 items-center border-b border-[var(--color-border)] px-5">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button
            ref={closeButtonRef}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            type="button"
            aria-label="우측 배너 닫기"
            onClick={onClose}
          >
            X
          </button>
        </header>
        <div className="h-[calc(100%-56px)] overflow-auto p-5">{children}</div>
      </aside>
    </div>
  )
}
