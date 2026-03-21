import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      name: 'algo-explorer-guest', // localStorage key
    },
  ),
)
