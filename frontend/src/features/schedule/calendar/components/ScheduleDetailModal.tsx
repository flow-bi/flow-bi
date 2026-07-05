import { Modal } from '../../../../shared/components/Modal'
import { useDeleteSchedule, useSchedule } from '../hooks'

type ScheduleDetailModalProps = {
  scheduleId: number | null
  onClose: () => void
}

export function ScheduleDetailModal({ scheduleId, onClose }: ScheduleDetailModalProps) {
  const scheduleQuery = useSchedule(scheduleId)
  const deleteMutation = useDeleteSchedule()
  const schedule = scheduleQuery.data

  return (
    <Modal title="일정 상세" isOpen={scheduleId !== null} onClose={onClose}>
      {scheduleQuery.isPending ? (
        <p className="text-sm text-[var(--color-text-muted)]">일정을 불러오는 중입니다.</p>
      ) : null}
      {scheduleQuery.isError ? (
        <p className="text-sm text-[var(--color-danger)]">일정을 불러오지 못했습니다.</p>
      ) : null}
      {schedule ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--color-primary)]">
              {schedule.scheduleType}
            </p>
            <h3 className="mt-1 text-[18px] font-semibold">{schedule.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {formatDateTime(schedule.startAt)} - {formatDateTime(schedule.endAt)}
            </p>
          </div>
          <dl className="grid gap-3 text-sm">
            <Row label="열람 범위" value={schedule.visibility} />
            <Row label="색상" value={schedule.colorLabel ?? '-'} />
            <Row label="위치" value={schedule.location ?? '-'} />
            <Row label="설명" value={schedule.content ?? '-'} />
            <Row label="공유 대상" value={`${schedule.targets.length}개`} />
          </dl>
          <button
            className="h-10 w-full rounded-md border border-[var(--color-danger)] px-3 text-sm font-semibold text-[var(--color-danger)] disabled:opacity-60"
            disabled={deleteMutation.isPending}
            type="button"
            onClick={() => {
              deleteMutation.mutate(schedule.scheduleId, { onSuccess: onClose })
            }}
          >
            일정 삭제
          </button>
        </div>
      ) : null}
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd>{value}</dd>
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
