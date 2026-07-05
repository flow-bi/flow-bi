import { z } from 'zod'

export const loginSchema = z.object({
  employeeNumber: z.string().min(1, '사번을 입력해주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
  deviceInfo: z.string().min(1).max(255),
})
