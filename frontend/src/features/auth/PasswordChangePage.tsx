import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { changePassword, LoginApiError, type LoginResult } from './api'
import { passwordChangeSchema, type PasswordChangeFormValues } from './passwordChangeSchema'

type Props = {
  changePassword?: (credentials: PasswordChangeFormValues) => Promise<LoginResult>
  logout?: () => Promise<void>
  onCompleted: () => void
  onLoggedOut?: () => void
  onSessionExpired?: () => void
}

function errorMessage(error: unknown): string {
  if (error instanceof LoginApiError) {
    if (error.status === 401) {
      return '세션이 만료되었습니다. 다시 로그인해 주세요.'
    }
    if (error.status === 403) {
      return '요청을 확인할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
    }
    if (error.status === 503) {
      return '비밀번호를 변경할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    }
    if (error.status === 400) {
      return '비밀번호 정책을 확인해 주세요.'
    }
  }
  return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
}

function logoutErrorMessage(error: unknown): string {
  if (error instanceof LoginApiError && error.status === 401) {
    return '세션이 만료되었습니다. 다시 로그인해 주세요.'
  }
  if (error instanceof LoginApiError && error.status === 403) {
    return '요청을 확인할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
  }
  return '로그아웃할 수 없습니다. 잠시 후 다시 시도해 주세요.'
}

export function PasswordChangePage({
  changePassword: submit = changePassword,
  logout: submitLogout,
  onCompleted,
  onLoggedOut,
  onSessionExpired,
}: Props) {
  const [requestError, setRequestError] = useState<string>()
  const [completed, setCompleted] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setFocus,
  } = useForm<PasswordChangeFormValues>({ resolver: zodResolver(passwordChangeSchema) })
  const displayedError = requestError ?? errors.newPassword?.message ?? errors.confirmation?.message

  useEffect(() => {
    if (errors.newPassword !== undefined) {
      setFocus('newPassword')
    } else if (errors.confirmation !== undefined) {
      setFocus('confirmation')
    } else if (requestError !== undefined) {
      errorRef.current?.focus()
    }
  }, [errors.confirmation, errors.newPassword, requestError, setFocus])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function onSubmit(values: PasswordChangeFormValues) {
    if (isSubmitting || isLoggingOut) {
      return
    }
    setRequestError(undefined)
    try {
      await submit(values)
      reset()
      setCompleted(true)
      onCompleted()
    } catch (error: unknown) {
      if (error instanceof LoginApiError && error.status === 401) {
        reset()
        onSessionExpired?.()
        return
      }
      setRequestError(errorMessage(error))
    }
  }

  async function onLogout() {
    if (submitLogout === undefined || isSubmitting || isLoggingOut) {
      return
    }
    setRequestError(undefined)
    setIsLoggingOut(true)
    try {
      await submitLogout()
      reset()
      onLoggedOut?.()
    } catch (error: unknown) {
      if (error instanceof LoginApiError && error.status === 401) {
        reset()
        onSessionExpired?.()
        return
      }
      setRequestError(logoutErrorMessage(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <main className="auth-destination">
      <section aria-labelledby="password-change-heading" className="login-card">
        <h1 id="password-change-heading" ref={headingRef} tabIndex={-1}>
          비밀번호 변경
        </h1>
        <p>계속하려면 새 비밀번호를 설정해 주세요.</p>
        {completed ? <p aria-live="polite">비밀번호가 변경되었습니다.</p> : null}
        <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          {displayedError !== undefined ? (
            <div
              aria-live="assertive"
              className="form-error"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
            >
              {displayedError}
            </div>
          ) : null}
          <div className="form-field">
            <label htmlFor="new-password">새 비밀번호</label>
            <input
              autoComplete="new-password"
              id="new-password"
              required
              type="password"
              {...register('newPassword')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="password-confirmation">비밀번호 확인</label>
            <input
              autoComplete="new-password"
              id="password-confirmation"
              required
              type="password"
              {...register('confirmation')}
            />
          </div>
          <button disabled={isSubmitting || isLoggingOut} type="submit">
            {isSubmitting ? '변경 중' : '비밀번호 변경'}
          </button>
        </form>
        {submitLogout !== undefined ? (
          <button
            disabled={isSubmitting || isLoggingOut}
            onClick={() => void onLogout()}
            type="button"
          >
            {isLoggingOut ? '로그아웃 중' : '로그아웃'}
          </button>
        ) : null}
      </section>
    </main>
  )
}
