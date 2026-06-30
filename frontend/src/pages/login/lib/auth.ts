import type { LoginCredentials } from '../types/login'

export function isDemoAccount(credentials: LoginCredentials, demoAccount: LoginCredentials) {
  return (
    credentials.loginId === demoAccount.loginId && credentials.password === demoAccount.password
  )
}
