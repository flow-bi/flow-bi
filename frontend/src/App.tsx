import { useEffect, useState } from 'react'

import { getSession, LoginApiError, logout } from './features/auth/api'
import { LoginPage } from './features/auth/LoginPage'
import { PasswordChangePage } from './features/auth/PasswordChangePage'

type Destination = 'home' | 'login' | 'password-change' | 'session-unavailable'

function App() {
  const [destination, setDestination] = useState<Destination>()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    void getSession()
      .then(({ mustChangePassword }) =>
        setDestination(mustChangePassword ? 'password-change' : 'home'),
      )
      .catch((error: unknown) =>
        setDestination(
          error instanceof LoginApiError && error.status === 503 ? 'session-unavailable' : 'login',
        ),
      )
  }, [])

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setDestination('login')
      setIsLoggingOut(false)
    }
  }

  if (destination === undefined) {
    return (
      <main aria-busy="true" className="auth-destination">
        인증 상태를 확인하고 있습니다.
      </main>
    )
  }
  if (destination === 'password-change') {
    return (
      <PasswordChangePage
        onCompleted={() => setDestination('home')}
        onSessionExpired={() => setDestination('login')}
      />
    )
  }
  if (destination === 'home') {
    return (
      <main className="auth-destination">
        <h1>Flow BI</h1>
        <p>로그인되었습니다.</p>
        <button disabled={isLoggingOut} onClick={() => void handleLogout()} type="button">
          {isLoggingOut ? '로그아웃 중' : '로그아웃'}
        </button>
      </main>
    )
  }
  if (destination === 'session-unavailable') {
    return (
      <main className="auth-destination">
        <h1>인증 상태를 확인할 수 없습니다</h1>
        <p>잠시 후 페이지를 새로고침해 주세요.</p>
      </main>
    )
  }
  return (
    <LoginPage
      onAuthenticated={({ mustChangePassword }) =>
        setDestination(mustChangePassword ? 'password-change' : 'home')
      }
    />
  )
}

export default App
