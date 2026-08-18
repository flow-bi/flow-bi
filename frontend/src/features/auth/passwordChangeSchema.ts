import { z } from 'zod'

const policyMessage = '영문, 숫자, 특수문자를 포함해 10자 이상 입력해 주세요.'
const passwordPolicy = z
  .string()
  .min(10, policyMessage)
  .regex(/[A-Za-z]/, policyMessage)
  .regex(/[0-9]/, policyMessage)
  .regex(/[^A-Za-z0-9]/, policyMessage)

export const passwordChangeSchema = z
  .object({ newPassword: passwordPolicy, confirmation: z.string() })
  .refine(({ newPassword, confirmation }) => newPassword === confirmation, {
    message: '새 비밀번호와 확인 값이 일치하지 않습니다.',
    path: ['confirmation'],
  })
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>
