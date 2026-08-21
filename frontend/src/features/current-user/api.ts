import { authenticatedFetch } from '../authenticatedFetch'

export const CURRENT_USER_QUERY_KEY = ['current-user'] as const

export type CurrentUser = {
  name: string
}

export class CurrentUserApiError extends Error {
  readonly status: number

  constructor(status: number, message = `Current user request failed with status ${status}`) {
    super(message)
    this.name = 'CurrentUserApiError'
    this.status = status
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await authenticatedFetch('/api/me/header')
  if (!response.ok) {
    throw new CurrentUserApiError(response.status)
  }

  const body: unknown = await response.json()
  if (
    typeof body !== 'object' ||
    body === null ||
    !('name' in body) ||
    typeof body.name !== 'string'
  ) {
    throw new CurrentUserApiError(response.status, 'Current user response is invalid')
  }

  return { name: body.name }
}
