import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const STORAGE_KEY = 'algo-explorer-guest'
const QUOTA_WARNING_KEY = 'ax-quota-warned'

// Custom storage wrapper that detects localStorage failures
const safeStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch (err) {
      // QuotaExceededError or SecurityError (private browsing)
      window.dispatchEvent(
        new CustomEvent('guest:storage-error', {
          detail: {
            type: err.name === 'QuotaExceededError' ? 'quota' : 'blocked',
            message:
              err.name === 'QuotaExceededError'
                ? 'Local storage is full. Consider clearing old runs or scenarios to free space.'
                : 'Local storage is unavailable. Your data will not persist across sessions.',
          },
        }),
      )
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

export const useGuestStore = create(
  persist(
    (set) => ({
      scenarios: [], // GuestScenario[] — saved locally by the guest user
      runs: [],      // GuestRun[] — run history saved locally

      saveScenario: (scenario) =>
        set((s) => ({
          scenarios: [
            scenario,
            ...s.scenarios.filter((sc) => sc.id !== scenario.id),
          ],
        })),

      deleteScenario: (id) =>
        set((s) => ({
          scenarios: s.scenarios.filter((sc) => sc.id !== id),
        })),

      saveRun: (run) =>
        set((s) => ({
          runs: [run, ...s.runs.filter((r) => r.id !== run.id)],
        })),

      deleteRun: (id) =>
        set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),

      clearRuns: () => set({ runs: [] }),

      clearAll: () => set({ scenarios: [], runs: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => safeStorage),
    },
  ),
)

/**
 * Returns an estimate of guest storage usage.
 * Useful for showing a quota indicator in the UI.
 */
export function getGuestStorageSize() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return { bytes: 0, formatted: '0 B' }
    const bytes = new Blob([data]).size
    if (bytes < 1024) return { bytes, formatted: `${bytes} B` }
    if (bytes < 1024 * 1024) return { bytes, formatted: `${(bytes / 1024).toFixed(1)} KB` }
    return { bytes, formatted: `${(bytes / (1024 * 1024)).toFixed(1)} MB` }
  } catch {
    return { bytes: 0, formatted: '0 B' }
  }
}
