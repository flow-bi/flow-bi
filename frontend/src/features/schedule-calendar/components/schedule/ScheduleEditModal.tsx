import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ScheduleWriteFields } from './ScheduleWriteFields'
import {
  ConfirmationDialog,
  confirmationDangerActionClass,
  confirmationSecondaryActionClass,
} from '../../../../shared/ui/ConfirmationDialog'
import {
  type AttendeeCandidate,
  type ScheduleDetail,
  type ScheduleTargetOptions,
  type UpdateScheduleRequest,
} from '../../api/scheduleCalendarApi'
import {
  modalCloseButtonClass,
  modalFooterClass,
  primaryModalActionClass,
} from '../../model/calendarPresentation'
import {
  scheduleDetailToFormValues,
  scheduleFormSchema,
  toScheduleRequest,
  type ScheduleFormValues,
} from '../../model/scheduleForm'

export function ScheduleEditModal({
  detail,
  error,
  isSaving,
  onClose,
  onSave,
  searchAttendees,
  getTargetOptions,
}: {
  detail: ScheduleDetail
  error: string | null
  isSaving: boolean
  onClose: () => void
  onSave: (request: UpdateScheduleRequest) => void
  searchAttendees: (query: string) => Promise<AttendeeCandidate[]>
  getTargetOptions: () => Promise<ScheduleTargetOptions>
}) {
  const [confirmClose, setConfirmClose] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: scheduleDetailToFormValues(detail),
  })
  const [selectedAttendees, setSelectedAttendees] = useState<AttendeeCandidate[]>(
    detail.participants ?? [],
  )
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  const close = useCallback(() => {
    if (form.formState.isDirty && !isSaving) {
      setConfirmClose(true)
    } else {
      onClose()
    }
  }, [form.formState.isDirty, isSaving, onClose])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (confirmClose) {
        setConfirmClose(false)
      } else {
        close()
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [close, confirmClose])
  return (
    <div
      aria-labelledby="schedule-edit-title"
      aria-modal="true"
      className="fixed inset-0 z-10 overflow-auto bg-slate-950/55 p-4"
      onClick={(event) => event.target === event.currentTarget && close()}
      role="dialog"
    >
      <section
        className="relative mx-auto my-0 w-full max-w-2xl rounded-xl bg-surface p-4 shadow-2xl sm:my-8 sm:p-6"
        data-testid="schedule-edit-panel"
      >
        <h2 className="m-0 text-xl font-bold text-text-primary" id="schedule-edit-title">
          일정 수정
        </h2>
        <button
          aria-label="닫기"
          className={modalCloseButtonClass}
          disabled={isSaving}
          onClick={close}
          ref={closeRef}
          type="button"
        >
          ×
        </button>
        <form
          className="mt-4 grid gap-3"
          noValidate
          onSubmit={(event) =>
            void form.handleSubmit((values) => onSave(toScheduleRequest(values)))(event)
          }
        >
          <ScheduleWriteFields
            form={form}
            getTargetOptions={getTargetOptions}
            idPrefix="schedule-edit"
            searchAttendees={searchAttendees}
            selectedAttendees={selectedAttendees}
            setSelectedAttendees={setSelectedAttendees}
          />
          {error && <p role="alert">{error}</p>}
          <div className={modalFooterClass}>
            <button className={primaryModalActionClass} disabled={isSaving} type="submit">
              {isSaving ? '수정 저장 중' : '수정 저장'}
            </button>
          </div>
        </form>
      </section>
      {confirmClose && (
        <ConfirmationDialog
          description="저장하지 않은 수정 내용은 사라집니다."
          footer={
            <>
              <button
                className={confirmationSecondaryActionClass}
                onClick={() => setConfirmClose(false)}
                type="button"
              >
                계속 수정
              </button>
              <button className={confirmationDangerActionClass} onClick={onClose} type="button">
                수정 취소하고 닫기
              </button>
            </>
          }
          onDismiss={() => setConfirmClose(false)}
          title="수정 내용을 버릴까요?"
          titleId="edit-discard-title"
        />
      )}
    </div>
  )
}
