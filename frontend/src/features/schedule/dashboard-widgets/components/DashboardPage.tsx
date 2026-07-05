import { useState } from 'react'

import { useSchedules } from '../../calendar/hooks'

export function DashboardPage() {
  const [today] = useState(() => toDateInput(new Date()))
  const todayQuery = useSchedules('day', today)
  const weekQuery = useSchedules('week', today)

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          오늘과 이번 주 일정을 빠르게 확인합니다.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-disabled-bg)] p-5">
        <p className="text-xs font-semibold text-[var(--color-primary)]">AI 요약</p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          AI 일정 요약은 MVP2에서 연결됩니다.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Widget title="오늘의 일정" isPending={todayQuery.isPending} isError={todayQuery.isError}>
          {(todayQuery.data ?? []).map((schedule) => (
            <ScheduleItem
              key={schedule.scheduleId}
              title={schedule.title}
              startAt={schedule.startAt}
              endAt={schedule.endAt}
            />
          ))}
        </Widget>

        <Widget title="주간 일정" isPending={weekQuery.isPending} isError={weekQuery.isError}>
          {(weekQuery.data ?? []).map((schedule) => (
            <ScheduleItem
              key={schedule.scheduleId}
              title={schedule.title}
              startAt={schedule.startAt}
              endAt={schedule.endAt}
            />
          ))}
        </Widget>
      </div>
    </section>
  )
}

function Widget({
  title,
  isPending,
  isError,
  children,
}: {
  title: string
  isPending: boolean
  isError: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <div className="mt-4 space-y-2">
        {isPending ? (
          <p className="text-sm text-[var(--color-text-muted)]">일정을 불러오는 중입니다.</p>
        ) : null}
        {isError ? (
          <p className="text-sm text-[var(--color-danger)]">일정을 불러오지 못했습니다.</p>
        ) : null}
        {!isPending && !isError && children}
      </div>
    </section>
  )
}

function ScheduleItem({
  title,
  startAt,
  endAt,
}: {
  title: string
  startAt: string
  endAt: string
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {formatDateTime(startAt)} - {formatDateTime(endAt)}
      </p>
    </div>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
