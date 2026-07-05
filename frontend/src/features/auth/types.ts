import type { components } from '../../shared/types/openapi'

type AuthTokenResponse = components['schemas']['AuthTokenResponse']
type AuthUserResponse = components['schemas']['AuthUserResponse']

export type AuthUser = {
  userId: NonNullable<AuthUserResponse['user_id']>
  employeeNumber: NonNullable<AuthUserResponse['employee_number']>
  name: NonNullable<AuthUserResponse['name']>
}

export type AuthSession = {
  accessToken: NonNullable<AuthTokenResponse['access_token']>
  refreshToken: NonNullable<AuthTokenResponse['refresh_token']>
  tokenType: NonNullable<AuthTokenResponse['token_type']>
  expiresIn: NonNullable<AuthTokenResponse['expires_in']>
  user: AuthUser
}

export type LoginFormValues = {
  employeeNumber: string
  password: string
  deviceInfo: string
}
