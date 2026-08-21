import { useQuery } from '@tanstack/react-query'

import { CURRENT_USER_QUERY_KEY, getCurrentUser } from './api'

export function CurrentUserName() {
  const currentUserQuery = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
  })

  if (currentUserQuery.isPending) {
    return <span aria-live="polite">사용자 이름을 불러오는 중입니다.</span>
  }

  if (currentUserQuery.isError) {
    return (
      <span role="alert">
        사용자 이름을 불러올 수 없습니다.{' '}
        <button onClick={() => void currentUserQuery.refetch()} type="button">
          다시 시도
        </button>
      </span>
    )
  }

  return <>{currentUserQuery.data.name}</>
}
