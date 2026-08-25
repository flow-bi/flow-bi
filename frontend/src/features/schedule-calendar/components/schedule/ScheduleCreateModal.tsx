import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ScheduleWriteFields } from './ScheduleWriteFields'
import {
  ConfirmationDialog,
  confirmationDangerActionClass,
  confirmationSecondaryActionClass,
} from '../../../../shared/ui/ConfirmationDialog'
import {
  type AttendeeCandidate,
  type CreateScheduleRequest,
  type ScheduleTargetOptions,
  ScheduleApiError,
  createSchedule as createScheduleRequest,
  getScheduleTargetOptions as getScheduleTargetOptionsRequest,
  searchAttendees as searchAttendeesRequest,
} from '../../api/scheduleCalendarApi'
import {
  createScheduleFormValues,
  scheduleFormSchema,
  toScheduleRequest,
  type ScheduleFormValues,
} from '../../model/scheduleForm'

const secondaryButtonClass =
  'rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-text-primary hover:border-primary hover:bg-secondary focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2'

export interface ScheduleCreateModalProps {
  onClose: () => void
  createSchedule?: (request: CreateScheduleRequest) => Promise<void>
  searchAttendees?: (query: string) => Promise<AttendeeCandidate[]>
  getTargetOptions?: () => Promise<ScheduleTargetOptions>
}

export function ScheduleCreateModal({
  onClose,
  createSchedule = createScheduleRequest,
  searchAttendees = searchAttendeesRequest,
  getTargetOptions = getScheduleTargetOptionsRequest,
}: ScheduleCreateModalProps) {
  const lastFocusedElement = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const [dirtyCloseConfirmation, setDirtyCloseConfirmation] = useState(false)
  const [selectedAttendees, setSelectedAttendees] = useState<AttendeeCandidate[]>([])
  const queryClient = useQueryClient()
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: createScheduleFormValues(),
  })
  const { isDirty } = form.formState
  const mutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: async (_result, request) => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const [scope, from, to] = query.queryKey
          return (
            scope === 'schedules' &&
            typeof from === 'string' &&
            typeof to === 'string' &&
            from <= request.startAt &&
            request.startAt < to
          )
        },
      })
      close()
    },
    onError: (error) => {
      if (error instanceof ScheduleApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors ?? {})) {
          form.setError(field as keyof ScheduleFormValues, { message })
        }
      }
    },
  })
  function close() {
    queryClient.removeQueries({ queryKey: ['schedule', 'attendee-candidates'] })
    lastFocusedElement.current?.focus()
    onClose()
  }
  function requestClose() {
    if (mutation.isPending) {
      return
    }
    if (isDirty) {
      setDirtyCloseConfirmation(true)
      return
    }
    close()
  }
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })
  return (
    <div
      aria-labelledby="schedule-create-title"
      aria-modal="true"
      className="fixed inset-0 z-10 overflow-auto bg-slate-950/55 p-4"
      data-testid="schedule-create-backdrop"
      onClick={(event) => event.target === event.currentTarget && requestClose()}
      role="dialog"
    >
      <section
        className="mx-auto my-0 w-full max-w-2xl rounded-xl bg-surface p-4 shadow-2xl sm:my-8 sm:p-6"
        data-testid="schedule-create-panel"
      >
        <header className="flex items-center justify-between gap-4">
          <h1 className="m-0 text-xl font-bold text-text-primary" id="schedule-create-title">
            일정 추가
          </h1>
          <button
            aria-label="일정 추가 닫기"
            className={secondaryButtonClass}
            onClick={requestClose}
            type="button"
          >
            닫기
          </button>
        </header>
        <form
          className="mt-4 grid gap-3"
          noValidate
          onSubmit={(event) =>
            void form.handleSubmit((values) => mutation.mutate(toScheduleRequest(values)))(event)
          }
        >
          <ScheduleWriteFields
            form={form}
            getTargetOptions={getTargetOptions}
            idPrefix="schedule"
            searchAttendees={searchAttendees}
            selectedAttendees={selectedAttendees}
            setSelectedAttendees={setSelectedAttendees}
          />
          {mutation.isError && (
            <p role="alert">
              {mutation.error instanceof Error
                ? mutation.error.message
                : '일정을 저장하지 못했습니다. 다시 시도해 주세요.'}
            </p>
          )}
          <footer className="flex flex-wrap items-center justify-end gap-3">
            <button className={secondaryButtonClass} onClick={requestClose} type="button">
              취소
            </button>
            <button
              className="rounded-lg bg-primary px-3 py-2 font-semibold text-white focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? '일정 저장 중' : '일정 저장'}
            </button>
          </footer>
        </form>
      </section>
      {dirtyCloseConfirmation && (
        <ConfirmationDialog
          description="저장하지 않은 입력은 사라집니다."
          footer={
            <>
              <button
                className={confirmationSecondaryActionClass}
                onClick={() => setDirtyCloseConfirmation(false)}
                type="button"
              >
                계속 입력
              </button>
              <button className={confirmationDangerActionClass} onClick={close} type="button">
                입력 취소하고 닫기
              </button>
            </>
          }
          onDismiss={() => setDirtyCloseConfirmation(false)}
          title="입력한 내용을 버릴까요?"
          titleId="discard-title"
        />
      )}
    </div>
  )
}
