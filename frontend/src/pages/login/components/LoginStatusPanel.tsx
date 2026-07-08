import type { AuthUser, RequestStatus } from '../types/auth'

type LoginStatusPanelProps = {
  errorMessage: string
  status: RequestStatus
  user: AuthUser | null
}

export function LoginStatusPanel({ errorMessage, status, user }: LoginStatusPanelProps) {
  if (status === 'loading') {
    return (
      <div className="state-panel loading" role="status">
        로그인 요청을 확인하고 있습니다.
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="state-panel error" role="alert">
        {errorMessage}
      </div>
    )
  }

  if (status === 'success' && user) {
    return (
      <div className="state-panel success" role="status">
        {user.name}님, 로그인되었습니다. 대시보드 이동 준비가 완료되었습니다.
      </div>
    )
  }

  return (
    <div className="state-panel idle" role="status">
      사번과 비밀번호를 입력하면 로그인 버튼이 활성화됩니다.
    </div>
  )
}
