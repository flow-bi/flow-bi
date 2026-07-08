import { useState, type FormEvent } from 'react'

import { LoginForm } from './components/LoginForm'
import { LoginStatusPanel } from './components/LoginStatusPanel'
import { mockLogin } from './mock/authMock'

import type { AuthUser, RequestStatus } from './types/auth'

type LoginPageProps = {
  onLogin: (user: AuthUser) => void
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)

  const isSubmitDisabled =
    status === 'loading' || employeeNumber.trim().length === 0 || password.trim().length === 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitDisabled) {
      setStatus('error')
      setErrorMessage('사번과 비밀번호를 모두 입력하세요.')
      return
    }

    setStatus('loading')
    setErrorMessage('')
    setUser(null)

    try {
      const response = await mockLogin({
        employeeNumber: employeeNumber.trim(),
        password,
      })

      setUser(response.user)
      setStatus('success')
      onLogin(response.user)
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : '로그인 요청에 실패했습니다.')
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card-header">
          <p className="section-label">Login</p>
          <h2 id="login-title">사내 계정으로 로그인</h2>
          <p>사번과 비밀번호를 입력해 AI Groupware에 접속하세요.</p>
        </div>

        <LoginStatusPanel errorMessage={errorMessage} status={status} user={user} />

        <LoginForm
          employeeNumber={employeeNumber}
          isDisabled={isSubmitDisabled}
          password={password}
          status={status}
          onEmployeeNumberChange={(value) => {
            setEmployeeNumber(value)
            setStatus('idle')
          }}
          onPasswordChange={(value) => {
            setPassword(value)
            setStatus('idle')
          }}
          onSubmit={(event) => {
            void handleSubmit(event)
          }}
        />

        <div className="login-meta">
          <span>개발용 mock 계정</span>
          <strong>A1001 / demo1234</strong>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
