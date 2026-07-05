import { create } from 'zustand'

import type { AuthSession } from './types'

const STORAGE_KEY = 'flowbi.auth'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthSession['user'] | null
  isAuthenticated: boolean
  setSession: (session: AuthSession) => void
  clearSession: () => void
}

const storedSession = readStoredSession()

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: storedSession?.accessToken ?? null,
  refreshToken: storedSession?.refreshToken ?? null,
  user: storedSession?.user ?? null,
  isAuthenticated: Boolean(storedSession?.accessToken),
  setSession: (session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
      isAuthenticated: true,
    })
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
  },
}))

function readStoredSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as AuthSession) : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}
