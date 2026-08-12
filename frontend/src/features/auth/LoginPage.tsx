import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { login, type LoginResult } from './api'
import { loginErrorMessage } from './loginError'
import { loginSchema, type LoginFormValues } from './loginSchema'

const DevelopmentTestAccountNotice = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('./testAccounts')).TestAccountNotice }))
  : undefined

type LoginPageProps = {
  login?: (credentials: LoginFormValues) => Promise<LoginResult>
  onAuthenticated: (result: LoginResult) => void
}

export function LoginPage({ login: submitLogin = login, onAuthenticated }: LoginPageProps) {
  const [requestError, setRequestError] = useState<string>()
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setFocus,
    setValue,
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const validationError = errors.employeeNumber?.message ?? errors.password?.message
  const displayedError = requestError ?? validationError

  useEffect(() => {
    if (errors.employeeNumber !== undefined) {
      setFocus('employeeNumber')
    } else if (errors.password !== undefined) {
      setFocus('password')
    } else if (requestError !== undefined) {
      errorSummaryRef.current?.focus()
    }
  }, [errors.employeeNumber, errors.password, requestError, setFocus])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function onSubmit(values: LoginFormValues) {
    if (isSubmitting) {
      return
    }

    setRequestError(undefined)
    try {
      const result = await submitLogin(values)
      onAuthenticated(result)
    } catch (error: unknown) {
      setRequestError(loginErrorMessage(error))
    }
  }

  return (
    <main className="login-page">
      <section aria-labelledby="login-heading" className="login-card">
        <h1 id="login-heading" ref={headingRef} tabIndex={-1}>
          로그인
        </h1>
        <p>사번과 비밀번호를 입력해 주세요.</p>
        <form
          noValidate
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event)
          }}
        >
          {displayedError !== undefined && (
            <div
              aria-live="assertive"
              className="form-error"
              id="login-error"
              ref={errorSummaryRef}
              role="alert"
              tabIndex={-1}
            >
              {displayedError}
            </div>
          )}
          <div className="form-field">
            <label htmlFor="employee-number">사번</label>
            <input
              aria-describedby={errors.employeeNumber === undefined ? undefined : 'login-error'}
              autoComplete="username"
              id="employee-number"
              inputMode="text"
              required
              {...register('employeeNumber')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">비밀번호</label>
            <input
              aria-describedby={errors.password === undefined ? undefined : 'login-error'}
              autoComplete="current-password"
              id="password"
              required
              type="password"
              {...register('password')}
            />
          </div>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? '로그인 중' : '로그인'}
          </button>
        </form>
      </section>
      {DevelopmentTestAccountNotice === undefined ? null : (
        <Suspense fallback={null}>
          <DevelopmentTestAccountNotice
            onEmployeeAccountCreated={(employeeNumber) => {
              setValue('employeeNumber', employeeNumber, { shouldDirty: true })
              setValue('password', '')
            }}
          />
        </Suspense>
      )}
    </main>
  )
}
