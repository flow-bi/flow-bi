import { useAuthStore } from '../../features/auth/store'

import type { components } from '../types/openapi'

const API_BASE_URL = getApiBaseUrl()

type Envelope<T> = {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: string
  }
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean
  skipRefresh?: boolean
}

export class ApiError extends Error {
  code: string
  details?: string
  status: number

  constructor(status: number, code: string, message: string, details?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await request(path, options)

  if (response.status === 401 && !options.skipRefresh) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipRefresh: true })
    }
  }

  return unwrap<T>(response)
}

async function request(path: string, options: RequestOptions): Promise<Response> {
  const { accessToken } = useAuthStore.getState()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (!options.skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
}

async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as Envelope<unknown>

  if (!response.ok || !body.success) {
    throw new ApiError(
      response.status,
      body.error?.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? '요청을 처리하지 못했습니다.',
      body.error?.details,
    )
  }

  return toCamelCase(body.data) as T
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState()
  if (!refreshToken) {
    clearSession()
    return false
  }

  try {
    const data = await apiFetch<RefreshSession>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      skipAuth: true,
      skipRefresh: true,
    })
    setSession(data)
    return true
  } catch {
    clearSession()
    return false
  }
}

function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCamelCase)
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        toCamelCase(item),
      ]),
    )
  }

  return value
}

function getApiBaseUrl() {
  const value: unknown = import.meta.env.VITE_API_BASE_URL
  return typeof value === 'string' ? value : ''
}

type AuthTokenResponse = components['schemas']['AuthTokenResponse']
type AuthUserResponse = components['schemas']['AuthUserResponse']

type RefreshSession = {
  accessToken: NonNullable<AuthTokenResponse['access_token']>
  refreshToken: NonNullable<AuthTokenResponse['refresh_token']>
  tokenType: NonNullable<AuthTokenResponse['token_type']>
  expiresIn: NonNullable<AuthTokenResponse['expires_in']>
  user: {
    userId: NonNullable<AuthUserResponse['user_id']>
    employeeNumber: NonNullable<AuthUserResponse['employee_number']>
    name: NonNullable<AuthUserResponse['name']>
  }
}
