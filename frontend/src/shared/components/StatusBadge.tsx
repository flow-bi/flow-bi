type StatusBadgeProps = {
  tone: 'success' | 'warning' | 'muted'
  label: string
}

const toneClassName = {
  success:
    'border-[color:rgb(22_163_74/0.22)] bg-[color:rgb(22_163_74/0.08)] text-[var(--color-success)]',
  warning:
    'border-[color:rgb(217_119_6/0.22)] bg-[color:rgb(217_119_6/0.08)] text-[var(--color-warning)]',
  muted:
    'border-[color:rgb(107_114_128/0.22)] bg-[color:rgb(107_114_128/0.08)] text-[var(--color-text-muted)]',
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-semibold ${toneClassName[tone]}`}
    >
      {label}
    </span>
  )
}
