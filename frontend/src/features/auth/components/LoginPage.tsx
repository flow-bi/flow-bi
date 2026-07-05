import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { ApiError } from '../../../shared/api/client'
import { useLoginMutation, useLogoutMutation } from '../hooks'
import { loginSchema } from '../schema'
import { useAuthStore } from '../store'

import type { LoginFormValues } from '../types'

type LoginPageProps = {
  onAuthenticated?: () => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const loginMutation = useLoginMutation()
  const logoutMutation = useLogoutMutation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeNumber: '',
      password: '',
      deviceInfo: getDeviceInfo(),
    },
  })

  const errorMessage =
    loginMutation.error instanceof ApiError
      ? loginMutation.error.message
      : loginMutation.error
        ? '로그인 요청을 처리하지 못했습니다.'
        : null

  useEffect(() => {
    if (isAuthenticated) {
      onAuthenticated?.()
    }
  }, [isAuthenticated, onAuthenticated])

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-5 py-10 text-[var(--color-text)]">
      <section className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-5xl items-center gap-8 md:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <p className="text-sm font-semibold text-[var(--color-primary)]">Flow BI Groupware</p>
          <h1 className="max-w-xl text-3xl font-bold leading-tight md:text-4xl">
            업무 시작을 위한 로그인
          </h1>
          <p className="max-w-lg text-sm leading-6 text-[var(--color-text-muted)]">
            사번과 비밀번호로 접속하면 일정, 회의실 예약, 조직 정보를 사용할 수 있습니다.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          {isAuthenticated && user ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">현재 로그인</p>
                <h2 className="mt-1 text-lg font-semibold">{user.name}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{user.employeeNumber}</p>
              </div>
              <button
                className="h-11 w-full rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-60"
                disabled={logoutMutation.isPending}
                type="button"
                onClick={() => logoutMutation.mutate()}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                void handleSubmit((values) => loginMutation.mutate(values))(event)
              }}
            >
              <div>
                <h2 className="text-lg font-semibold">로그인</h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  발급받은 사번과 비밀번호를 입력하세요.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="employeeNumber">
                  사번
                </label>
                <input
                  id="employeeNumber"
                  className="h-11 w-full rounded-md border border-[var(--color-border)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  aria-describedby={errors.employeeNumber ? 'employeeNumber-error' : undefined}
                  autoComplete="username"
                  {...register('employeeNumber')}
                />
                {errors.employeeNumber ? (
                  <p className="text-sm text-[var(--color-danger)]" id="employeeNumber-error">
                    {errors.employeeNumber.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="password">
                  비밀번호
                </label>
                <input
                  id="password"
                  className="h-11 w-full rounded-md border border-[var(--color-border)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  autoComplete="current-password"
                  type="password"
                  {...register('password')}
                />
                {errors.password ? (
                  <p className="text-sm text-[var(--color-danger)]" id="password-error">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <input type="hidden" {...register('deviceInfo')} />

              {errorMessage ? (
                <p className="text-sm text-[var(--color-danger)]">{errorMessage}</p>
              ) : null}

              <button
                className="h-11 w-full rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-60"
                disabled={loginMutation.isPending}
                type="submit"
              >
                {loginMutation.isPending ? '로그인 중' : '로그인'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

function getDeviceInfo() {
  return navigator.userAgent.slice(0, 255)
}
