import { useState, type FormEvent } from 'react'

import { LoginBrandPanel } from './components/LoginBrandPanel'
import { LoginForm } from './components/LoginForm'
import { AUTH_ERROR_MESSAGES, LOGIN_DELAY_MS } from './constants/login'
import { isDemoAccount } from './lib/auth'
import { DEMO_ACCOUNT, LOGIN_STATS } from './mock/login'

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!loginId || !password) {
      setError(AUTH_ERROR_MESSAGES.required)
      return
    }
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (isDemoAccount({ loginId, password }, DEMO_ACCOUNT)) {
        onLogin()
      } else {
        setError(AUTH_ERROR_MESSAGES.invalid)
        setLoading(false)
      }
    }, LOGIN_DELAY_MS)
  }

  const formState = {
    loginId,
    password,
    showPassword,
    error,
    loading,
  }

  const formActions = {
    onLoginIdChange: setLoginId,
    onPasswordChange: setPassword,
    onTogglePassword: () => setShowPassword((currentShowPassword) => !currentShowPassword),
    onSubmit: handleSubmit,
  }

  return (
    <div className="min-h-screen flex">
      <LoginBrandPanel stats={LOGIN_STATS} />
      <LoginForm formState={formState} formActions={formActions} demoAccount={DEMO_ACCOUNT} />
    </div>
  )
}
