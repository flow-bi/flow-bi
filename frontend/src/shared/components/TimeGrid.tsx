import type { ReactNode } from 'react'

type TimeGridProps = {
  rows: {
    id: number
    label: string
    meta: string
    content: ReactNode
  }[]
}

const hours = Array.from({ length: 10 }, (_, index) => index + 9)

export function TimeGrid({ rows }: TimeGridProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="min-w-[880px]">
        <div className="grid grid-cols-[180px_repeat(9,minmax(72px,1fr))] border-b border-[var(--color-border)] bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-text-muted)]">
          <div className="px-4 py-3">회의실</div>
          {hours.slice(0, -1).map((hour) => (
            <div
              key={hour}
              className="border-l border-[var(--color-border)] px-3 py-3 tabular-nums"
            >
              {hour}:00
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid min-h-[72px] grid-cols-[180px_repeat(9,minmax(72px,1fr))] border-b border-[var(--color-border)] last:border-b-0"
          >
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-[var(--color-text)]">{row.label}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{row.meta}</p>
            </div>
            <div className="relative col-span-9 grid grid-cols-9">
              {hours.slice(0, -1).map((hour) => (
                <div key={hour} className="border-l border-[var(--color-border)]" />
              ))}
              {row.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
