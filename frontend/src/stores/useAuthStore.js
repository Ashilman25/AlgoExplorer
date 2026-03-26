import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAuthTokenResolver } from '../services/client'
import {
  AUTH_PERSISTENCE_VERSION,
  migrateAuthState,
  safeJsonParse,
  safeJsonStringify,
} from '../services/persistenceService'


const STORAGE_KEY = 'algo-explorer-auth'

const authStorage = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name)
      if (!raw) return null
      return safeJsonParse(raw, null)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, safeJsonStringify(value, 'auth storage'))
    } catch {
      // silent fallback — auth can rebootstrap from a fresh login
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      // silent fail
    }
  },
}


export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isInitialized: false,

      setSession: ({ access_token, user }) =>
        set({
          accessToken: access_token,
          user,
          isInitialized: true,
        }),

      setUser: (user) =>
        set({
          user,
          isInitialized: true,
        }),

      clearSession: () =>
        set({
          accessToken: null,
          user: null,
          isInitialized: true,
        }),

      markInitialized: () => set({ isInitialized: true }),
    }),
    {
      name: STORAGE_KEY,
      version: AUTH_PERSISTENCE_VERSION,
      storage: authStorage,
      migrate: (persistedState) => migrateAuthState(persistedState),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
)

setAuthTokenResolver(() => useAuthStore.getState().accessToken)
