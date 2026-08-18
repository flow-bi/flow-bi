import { z } from 'zod'

export const employeeAccountSchema = z
  .object({
    employeeNumber: z
      .string()
      .trim()
      .min(1, '사번을 입력해 주세요.')
      .max(50, '사번은 50자 이하여야 합니다.')
      .regex(/^[A-Za-z0-9-]+$/, '사번 형식을 확인해 주세요.'),
    email: z
      .string()
      .trim()
      .email('이메일 형식을 확인해 주세요.')
      .max(255, '이메일은 255자 이하여야 합니다.'),
    name: z
      .string()
      .trim()
      .min(1, '이름을 입력해 주세요.')
      .max(100, '이름은 100자 이하여야 합니다.'),
    teamId: z.number().int().positive('팀을 선택해 주세요.'),
    positionId: z.number().int().positive('직급을 선택해 주세요.'),
    initialPassword: z
      .string()
      .min(10, '초기 비밀번호는 10자 이상이어야 합니다.')
      .max(128, '초기 비밀번호는 128자 이하여야 합니다.')
      .regex(/[A-Za-z]/, '초기 비밀번호에 영문자를 포함해 주세요.')
      .regex(/\d/, '초기 비밀번호에 숫자를 포함해 주세요.')
      .regex(/[^A-Za-z\d]/, '초기 비밀번호에 특수문자를 포함해 주세요.'),
    confirmation: z.string().min(1, '비밀번호 확인을 입력해 주세요.'),
  })
  .refine((values) => values.initialPassword === values.confirmation, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmation'],
  })

export type EmployeeAccountFormValues = z.infer<typeof employeeAccountSchema>
