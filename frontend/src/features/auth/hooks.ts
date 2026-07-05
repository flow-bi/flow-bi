import { useMutation } from '@tanstack/react-query'

import { login, logout } from './api'
import { useAuthStore } from './store'

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession)

  return useMutation({
    mutationFn: login,
    onSuccess: setSession,
  })
}

export function useLogoutMutation() {
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const clearSession = useAuthStore((state) => state.clearSession)

  return useMutation({
    mutationFn: () => (refreshToken ? logout(refreshToken) : Promise.resolve({ revoked: true })),
    onSettled: clearSession,
  })
}
