import { BRAND_PRIMARY } from '@/constants/brand'

import { DemoAccountCard } from './DemoAccountCard'
import { LoginErrorMessage } from './LoginErrorMessage'
import { LoginFormHeader } from './LoginFormHeader'
import { LoginMobileBrand } from './LoginMobileBrand'
import { LoginPasswordField } from './LoginPasswordField'
import { LoginTextField } from './LoginTextField'

import type { LoginCredentials, LoginFormActions, LoginFormState } from '../types/login'

interface LoginFormProps {
  formState: LoginFormState
  formActions: LoginFormActions
  demoAccount: LoginCredentials
}

export function LoginForm({ formState, formActions, demoAccount }: LoginFormProps) {
  const { loginId, password, showPassword, error, loading } = formState
  const { onLoginIdChange, onPasswordChange, onTogglePassword, onSubmit } = formActions

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-white">
      <div className="w-full max-w-sm">
        <LoginMobileBrand />
        <LoginFormHeader />

        <form onSubmit={onSubmit} className="space-y-4">
          <LoginTextField
            id="login-id"
            label="아이디"
            value={loginId}
            placeholder="로그인 아이디"
            onChange={onLoginIdChange}
          />
          <LoginPasswordField
            id="login-password"
            label="비밀번호"
            value={password}
            showPassword={showPassword}
            placeholder="비밀번호"
            onChange={onPasswordChange}
            onTogglePassword={onTogglePassword}
          />

          <LoginErrorMessage message={error} />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 mt-1"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <DemoAccountCard demoAccount={demoAccount} />
      </div>
    </div>
  )
}
