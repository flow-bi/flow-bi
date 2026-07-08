import type { RequestStatus } from '../types/auth'
import type { FormEvent } from 'react'

type LoginFormProps = {
  employeeNumber: string
  isDisabled: boolean
  password: string
  status: RequestStatus
  onEmployeeNumberChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginForm({
  employeeNumber,
  isDisabled,
  onEmployeeNumberChange,
  onPasswordChange,
  onSubmit,
  password,
  status,
}: LoginFormProps) {
  return (
    <form className="login-form" onSubmit={onSubmit}>
      <label className="field">
        <span>사번</span>
        <input
          autoComplete="username"
          inputMode="text"
          placeholder="예: A1001"
          value={employeeNumber}
          onChange={(event) => {
            onEmployeeNumberChange(event.target.value)
          }}
        />
      </label>

      <label className="field">
        <span>비밀번호</span>
        <input
          autoComplete="current-password"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(event) => {
            onPasswordChange(event.target.value)
          }}
        />
      </label>

      <button className="primary-button" disabled={isDisabled} type="submit">
        {status === 'loading' ? '로그인 중' : '로그인'}
      </button>
    </form>
  )
}
