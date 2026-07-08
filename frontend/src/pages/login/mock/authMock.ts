import type { LoginRequest, LoginResponse } from '../types/auth'

const mockUser: LoginResponse['user'] = {
  userId: 'user-001',
  employeeNumber: 'A1001',
  name: '김민준',
  email: 'minjun.kim@company.example',
  phoneNumber: '010-1234-5678',
  status: 'ACTIVE',
  profileImageUrl: '',
  team: '플랫폼팀',
  position: '프로덕트 매니저',
  roles: ['USER', 'ADMIN'],
}

export async function mockLogin(request: LoginRequest): Promise<LoginResponse> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 450)
  })

  if (request.employeeNumber !== 'A1001' || request.password !== 'demo1234') {
    throw new Error('사번 또는 비밀번호가 올바르지 않습니다.')
  }

  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
  }
}
