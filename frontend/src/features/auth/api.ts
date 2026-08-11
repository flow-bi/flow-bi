export type LoginResult = {
  mustChangePassword: boolean
}

export type SessionResult = LoginResult & { authenticated: true }
export type PasswordChangeCredentials = { newPassword: string; confirmation: string }

export type LoginCredentials = {
  employeeNumber: string
  password: string
}

export class LoginApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Login request failed with status ${status}`)
    this.name = 'LoginApiError'
    this.status = status
  }
}

function readCookie(name: string): string | undefined {
  const encodedName = `${encodeURIComponent(name)}=`
  const value = document.cookie.split('; ').find((cookie) => cookie.startsWith(encodedName))

  return value === undefined ? undefined : decodeURIComponent(value.slice(encodedName.length))
}

async function ensureCsrfToken(): Promise<string> {
  const bootstrapResponse = await fetch('/api/auth/csrf', { credentials: 'include' })
  if (!bootstrapResponse.ok) {
    throw new LoginApiError(bootstrapResponse.status)
  }

  const csrfToken = readCookie('XSRF-TOKEN')
  if (csrfToken === undefined) {
    throw new Error('CSRF token was not issued')
  }

  return csrfToken
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const csrfToken = await ensureCsrfToken()
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrfToken,
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new LoginApiError(response.status)
  }

  return (await response.json()) as LoginResult
}

export async function getSession(): Promise<SessionResult> {
  const response = await fetch('/api/auth/session', { credentials: 'include' })
  if (!response.ok) {
    throw new LoginApiError(response.status)
  }
  return (await response.json()) as SessionResult
}

export async function changePassword(credentials: PasswordChangeCredentials): Promise<LoginResult> {
  const csrfToken = await ensureCsrfToken()
  const response = await fetch('/api/auth/password', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
    body: JSON.stringify(credentials),
  })
  if (!response.ok) {
    throw new LoginApiError(response.status)
  }
  return (await response.json()) as LoginResult
}

export async function logout(): Promise<void> {
  const csrfToken = await ensureCsrfToken()
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-XSRF-TOKEN': csrfToken },
  })
  if (!response.ok) {
    throw new LoginApiError(response.status)
  }
}
