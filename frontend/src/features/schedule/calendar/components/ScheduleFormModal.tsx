import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Modal } from '../../../../shared/components/Modal'
import { useCreateSchedule } from '../hooks'
import { scheduleFormSchema } from '../schema'

import type { ScheduleFormValues } from '../schema'

type ScheduleFormModalProps = {
  isOpen: boolean
  selectedDate: string
  onClose: () => void
}

export function ScheduleFormModal({ isOpen, selectedDate, onClose }: ScheduleFormModalProps) {
  const [scheduleKind, setScheduleKind] = useState<'basic' | 'meeting-room'>('basic')
  const createMutation = useCreateSchedule()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: '',
      scheduleType: 'PERSONAL',
      visibility: 'PRIVATE',
      startAt: `${selectedDate}T09:00`,
      endAt: `${selectedDate}T10:00`,
      colorLabel: '파랑',
      location: '',
      content: '',
      attendeeUserIds: '',
      shareMode: 'PERSONAL',
      teamId: '',
      projectId: '',
    },
    values: {
      title: '',
      scheduleType: 'PERSONAL',
      visibility: 'PRIVATE',
      startAt: `${selectedDate}T09:00`,
      endAt: `${selectedDate}T10:00`,
      colorLabel: '파랑',
      location: '',
      content: '',
      attendeeUserIds: '',
      shareMode: 'PERSONAL',
      teamId: '',
      projectId: '',
    },
  })
  const shareMode = useWatch({ control, name: 'shareMode' })

  const close = () => {
    reset()
    setScheduleKind('basic')
    onClose()
  }

  return (
    <Modal title="일정 추가" isOpen={isOpen} onClose={close}>
      <div className="mb-5 grid grid-cols-2 rounded-md border border-[var(--color-border)] p-1">
        <button
          className={`h-9 rounded text-sm font-semibold ${
            scheduleKind === 'basic'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)]'
          }`}
          type="button"
          onClick={() => setScheduleKind('basic')}
        >
          기본 일정
        </button>
        <button
          className={`h-9 rounded text-sm font-semibold ${
            scheduleKind === 'meeting-room'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)]'
          }`}
          type="button"
          onClick={() => setScheduleKind('meeting-room')}
        >
          회의실 일정
        </button>
      </div>

      {scheduleKind === 'meeting-room' ? (
        <div className="space-y-4">
          <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-disabled-bg)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
            회의실 목록과 시간대 선택 UI가 들어갈 자리입니다. meetingroom 도메인의 `POST
            /api/v1/rooms/{'{roomId}'}/reservations` API가 구현되면 이 화면에서 같은 요청을
            호출합니다.
          </p>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">회의실 ID</span>
            <input
              className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
              disabled
              placeholder="meetingroom API 구현 후 연결"
            />
          </label>
          <button
            className="h-10 w-full rounded-md bg-[var(--color-disabled-bg)] px-3 text-sm font-semibold text-[var(--color-text-muted)]"
            disabled
            type="button"
          >
            회의실 예약 API 준비 중
          </button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            void handleSubmit((values) => {
              createMutation.mutate(values, { onSuccess: close })
            })(event)
          }}
        >
          <Field label="제목" error={errors.title?.message}>
            <input className="form-input" {...register('title')} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="일정 유형">
              <select className="form-input" {...register('scheduleType')}>
                <option value="PERSONAL">개인</option>
                <option value="TEAM">팀</option>
                <option value="PROJECT">프로젝트</option>
              </select>
            </Field>
            <Field label="열람 범위">
              <select className="form-input" {...register('visibility')}>
                <option value="PRIVATE">비공개</option>
                <option value="PUBLIC">전체 공개</option>
                <option value="TEAM_ONLY">팀 내 공개</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="시작 일시" error={errors.startAt?.message}>
              <input className="form-input" type="datetime-local" {...register('startAt')} />
            </Field>
            <Field label="종료 일시" error={errors.endAt?.message}>
              <input className="form-input" type="datetime-local" {...register('endAt')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="색상 라벨">
              <select className="form-input" {...register('colorLabel')}>
                {['빨강', '주황', '노랑', '초록', '파랑', '보라'].map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="위치" error={errors.location?.message}>
              <input className="form-input" {...register('location')} />
            </Field>
          </div>

          <Field label="참석자 사용자 ID">
            <input
              className="form-input"
              placeholder="예: 2, 3, 4"
              {...register('attendeeUserIds')}
            />
          </Field>

          <div className="rounded-md border border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold">공개 범위</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              이 선택은 visibility가 아니라 schedule_targets 공유 대상을 만듭니다.
            </p>
            <select className="form-input mt-3" {...register('shareMode')}>
              <option value="PERSONAL">개인</option>
              <option value="TEAM">팀</option>
              <option value="PROJECT">프로젝트</option>
            </select>
            {shareMode === 'TEAM' ? (
              <input className="form-input mt-3" placeholder="팀 ID" {...register('teamId')} />
            ) : null}
            {shareMode === 'PROJECT' ? (
              <input
                className="form-input mt-3"
                placeholder="프로젝트 ID"
                {...register('projectId')}
              />
            ) : null}
          </div>

          <Field label="상세 설명" error={errors.content?.message}>
            <textarea
              className="min-h-24 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              {...register('content')}
            />
          </Field>

          {createMutation.isError ? (
            <p className="text-sm text-[var(--color-danger)]">
              일정을 저장하지 못했습니다. 입력값을 확인해주세요.
            </p>
          ) : null}

          <button
            className="h-10 w-full rounded-md bg-[var(--color-primary)] px-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={createMutation.isPending}
            type="submit"
          >
            일정 추가
          </button>
        </form>
      )}
    </Modal>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? <span className="block text-sm text-[var(--color-danger)]">{error}</span> : null}
    </label>
  )
}
