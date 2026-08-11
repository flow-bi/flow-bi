import { z } from 'zod'

export const loginSchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(1, '사번을 입력해 주세요.')
    .max(50, '사번은 50자 이하여야 합니다.')
    .regex(/^[A-Za-z0-9-]+$/, '사번 형식을 확인해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.').max(128, '비밀번호를 확인해 주세요.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
