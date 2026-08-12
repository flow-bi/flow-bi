import type { EmployeeAccountFormValues } from './employeeAccountSchema'

export type EmployeeAccountOption = { id: number; name: string }
export type EmployeeAccountOptions = { teams: EmployeeAccountOption[]; positions: EmployeeAccountOption[] }
export type CreatedEmployeeAccount = { employeeNumber: string; mustChangePassword: true }

export class DevEmployeeAccountApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Development employee account request failed with status ${status}`)
    this.name = 'DevEmployeeAccountApiError'
    this.status = status
  }
}

function csrfToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((value) => value.startsWith('XSRF-TOKEN='))
  return cookie === undefined ? undefined : decodeURIComponent(cookie.slice('XSRF-TOKEN='.length))
}

async function csrfHeaders(): Promise<HeadersInit> {
  if (csrfToken() === undefined) {
    const response = await fetch('/api/auth/csrf', { credentials: 'include' })
    if (!response.ok) throw new DevEmployeeAccountApiError(response.status)
  }
  const token = csrfToken()
  if (token === undefined) throw new Error('CSRF token was not issued')
  return { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token }
}

export async function loadEmployeeAccountOptions(): Promise<EmployeeAccountOptions> {
  const response = await fetch('/api/dev/auth/employee-account-options', { credentials: 'include' })
  if (!response.ok) throw new DevEmployeeAccountApiError(response.status)
  return (await response.json()) as EmployeeAccountOptions
}

export async function createEmployeeAccount(
  values: EmployeeAccountFormValues,
): Promise<CreatedEmployeeAccount> {
  const response = await fetch('/api/dev/auth/employee-accounts', {
    method: 'POST',
    credentials: 'include',
    headers: await csrfHeaders(),
    body: JSON.stringify(values),
  })
  if (!response.ok) throw new DevEmployeeAccountApiError(response.status)
  return (await response.json()) as CreatedEmployeeAccount
}
