import { LoginApiError } from './api'

export function loginErrorMessage(error: unknown): string {
  const status =
    error instanceof LoginApiError || error instanceof Response ? error.status : undefined
  if (status !== undefined) {
    if (status === 401) {
      return '사번 또는 비밀번호가 올바르지 않습니다.'
    }
    if (status === 429) {
      return '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.'
    }
    if (status === 503) {
      return '인증 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    }
  }

  return '로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
}
