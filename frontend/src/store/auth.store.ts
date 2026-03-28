/**
 * Zustand auth store for global state management
 */
import { create } from 'zustand'
import { User, Org } from '@/src/types'
import { setToken, clearToken } from '@/src/lib/auth'

interface AuthState {
  user: User | null
  org: Org | null
  token: string | null
  isLoading: boolean
  error: string | null

  // Actions
  login: (token: string, user: User, org: Org) => void
  logout: () => void
  setUser: (user: User) => void
  setOrg: (org: Org) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  org: null,
  token: null,
  isLoading: false,
  error: null,

  login: (token: string, user: User, org: Org) => {
    setToken(token)
    set({
      token,
      user,
      org,
      error: null,
    })
  },

  logout: () => {
    clearToken()
    set({
      token: null,
      user: null,
      org: null,
      error: null,
    })
  },

  setUser: (user: User) => {
    set({ user })
  },

  setOrg: (org: Org) => {
    set({ org })
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },
}))
