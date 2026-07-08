export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

export type LoginRequest = {
  employeeNumber: string
  password: string
}

export type AuthUser = {
  userId: string
  employeeNumber: string
  name: string
  email: string
  phoneNumber: string
  status: 'ACTIVE' | 'INACTIVE'
  profileImageUrl: string
  team: string
  position: string
  roles: string[]
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
