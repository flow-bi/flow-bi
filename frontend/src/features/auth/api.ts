import { apiFetch } from '../../shared/api/client'

import type { AuthSession, LoginFormValues } from './types'
import type { components } from '../../shared/types/openapi'

export function login(values: LoginFormValues): Promise<AuthSession> {
  const body = {
    employee_number: values.employeeNumber,
    password: values.password,
    device_info: values.deviceInfo,
  } satisfies components['schemas']['LoginRequest']

  return apiFetch<AuthSession>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export function logout(refreshToken: string): Promise<{ revoked: boolean }> {
  const body = {
    refresh_token: refreshToken,
  } satisfies components['schemas']['LogoutRequest']

  return apiFetch<{ revoked: boolean }>('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}
