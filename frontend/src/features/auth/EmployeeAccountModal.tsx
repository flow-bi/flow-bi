import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'

import {
  createEmployeeAccount,
  DevEmployeeAccountApiError,
  loadEmployeeAccountOptions,
  type CreatedEmployeeAccount,
  type EmployeeAccountOptions,
} from './devEmployeeAccounts'
import { employeeAccountSchema, type EmployeeAccountFormValues } from './employeeAccountSchema'

type EmployeeAccountModalProps = {
  loadOptions?: () => Promise<EmployeeAccountOptions>
  createAccount?: (values: EmployeeAccountFormValues) => Promise<CreatedEmployeeAccount>
  onCreated: (employeeNumber: string) => void
  onClose: () => void
  returnFocusTo?: HTMLElement | null
}

const optionsErrorMessage = '참조 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

function creationErrorMessage(error: unknown): string {
  const status =
    error instanceof Response
      ? error.status
      : error instanceof DevEmployeeAccountApiError
        ? error.status
        : 0
  if (status === 400) {
    return '입력 내용을 확인한 뒤 다시 시도해 주세요.'
  }
  if (status === 404) {
    return '계정 생성 기능을 사용할 수 없습니다. 운영 환경에서는 관리자에게 문의해 주세요.'
  }
  if (status === 409) {
    return '이미 사용 중인 사번입니다. 다른 사번을 입력해 주세요.'
  }
  if (status === 503) {
    return '계정 생성 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '계정을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export function EmployeeAccountModal({
  loadOptions = loadEmployeeAccountOptions,
  createAccount = createEmployeeAccount,
  onCreated,
  onClose,
  returnFocusTo,
}: EmployeeAccountModalProps) {
  const [options, setOptions] = useState<EmployeeAccountOptions>()
  const [optionsError, setOptionsError] = useState<string>()
  const [requestError, setRequestError] = useState<string>()
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    setFocus,
  } = useForm<EmployeeAccountFormValues>({ resolver: zodResolver(employeeAccountSchema) })

  async function fetchOptions() {
    setOptionsError(undefined)
    try {
      setOptions(await loadOptions())
    } catch {
      setOptionsError(optionsErrorMessage)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(fetchOptions)
  }, [])
  useLayoutEffect(() => {
    if (options !== undefined) {
      setFocus('employeeNumber')
    }
  }, [options, setFocus])
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        requestClose()
      }
      if (event.key !== 'Tab' || dialogRef.current === null || confirmDiscard) {
        return
      }
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled])',
        ),
      ]
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmDiscard, isSubmitting, isDirty])

  function close() {
    onClose()
    returnFocusTo?.focus()
  }

  function requestClose() {
    if (isSubmitting) {
      return
    }
    if (isDirty) {
      setConfirmDiscard(true)
      return
    }
    close()
  }
  async function onSubmit(values: EmployeeAccountFormValues) {
    setRequestError(undefined)
    try {
      const result = await createAccount(values)
      onCreated(result.employeeNumber)
    } catch (error) {
      setRequestError(creationErrorMessage(error))
    }
  }
  const fieldError = (field: keyof EmployeeAccountFormValues) => errors[field]?.message

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        aria-describedby="employee-account-description"
        aria-labelledby="employee-account-title"
        aria-modal="true"
        className="employee-account-modal"
        ref={dialogRef}
        role="dialog"
      >
        <h2 id="employee-account-title">직원 계정 생성</h2>
        <p id="employee-account-description">
          개발 환경에서만 사용할 초기 비밀번호 계정을 생성합니다. 첫 로그인 후 비밀번호 변경이
          필요합니다.
        </p>
        {optionsError !== undefined ? (
          <div role="alert">
            <p>{optionsError}</p>
            <button type="button" onClick={() => void fetchOptions()}>
              다시 시도
            </button>
          </div>
        ) : options === undefined ? (
          <p aria-live="polite">팀과 직급 정보를 불러오는 중입니다.</p>
        ) : options.teams.length === 0 || options.positions.length === 0 ? (
          <p role="status">
            선택할 팀 또는 직급이 없습니다. 관리자에게 참조 정보를 등록해 달라고 요청해 주세요.
          </p>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event)
            }}
          >
            {requestError !== undefined && (
              <div className="form-error" role="alert">
                {requestError}
              </div>
            )}
            <Field label="사번" error={fieldError('employeeNumber')}>
              <input
                aria-describedby={
                  fieldError('employeeNumber') ? 'employee-number-error' : undefined
                }
                {...register('employeeNumber')}
                id="employee-number"
                required
              />
            </Field>
            <Field label="이메일" error={fieldError('email')}>
              <input
                autoComplete="email"
                {...register('email')}
                id="employee-email"
                required
                type="email"
              />
            </Field>
            <Field label="이름" error={fieldError('name')}>
              <input {...register('name')} id="employee-name" required />
            </Field>
            <Field label="팀" error={fieldError('teamId')}>
              <select
                {...register('teamId', { valueAsNumber: true })}
                id="employee-team"
                required
                defaultValue=""
              >
                <option disabled value="">
                  팀을 선택하세요
                </option>
                {options.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="직급" error={fieldError('positionId')}>
              <select
                {...register('positionId', { valueAsNumber: true })}
                id="employee-position"
                required
                defaultValue=""
              >
                <option disabled value="">
                  직급을 선택하세요
                </option>
                {options.positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="초기 비밀번호" error={fieldError('initialPassword')}>
              <input
                autoComplete="new-password"
                {...register('initialPassword')}
                id="initial-password"
                required
                type="password"
              />
            </Field>
            <Field label="비밀번호 확인" error={fieldError('confirmation')}>
              <input
                autoComplete="new-password"
                {...register('confirmation')}
                id="password-confirmation"
                required
                type="password"
              />
            </Field>
            <div className="modal-actions">
              <button disabled={isSubmitting} type="submit">
                {isSubmitting ? '생성 중' : '직원 계정 생성'}
              </button>
              <button disabled={isSubmitting} type="button" onClick={requestClose}>
                취소
              </button>
            </div>
          </form>
        )}
        <button
          aria-label="직원 계정 생성 모달 닫기"
          disabled={isSubmitting}
          type="button"
          onClick={requestClose}
        >
          닫기
        </button>
      </div>
      {confirmDiscard && (
        <div aria-modal="true" className="discard-confirmation" role="alertdialog">
          <p>입력한 내용을 버리고 닫을까요?</p>
          <button type="button" onClick={close}>
            닫기
          </button>
          <button autoFocus type="button" onClick={() => setConfirmDiscard(false)}>
            계속 입력
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="form-field">
      <label>
        {label}
        {children}
      </label>
      {error !== undefined && <p className="form-error">{error}</p>}
    </div>
  )
}
