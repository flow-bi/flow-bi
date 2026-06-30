import type { FormEvent } from 'react'

export interface LoginCredentials {
  loginId: string
  password: string
}

export interface LoginStat {
  label: string
  value: string
}

export interface LoginFormState {
  loginId: string
  password: string
  showPassword: boolean
  error: string
  loading: boolean
}

export interface LoginFormActions {
  onLoginIdChange: (loginId: string) => void
  onPasswordChange: (password: string) => void
  onTogglePassword: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}
