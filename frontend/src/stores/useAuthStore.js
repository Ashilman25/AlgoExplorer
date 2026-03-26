import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { setAuthTokenResolver } from '../services/client'


const STORAGE_KEY = 'algo-explorer-auth'


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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
)

setAuthTokenResolver(() => useAuthStore.getState().accessToken)
