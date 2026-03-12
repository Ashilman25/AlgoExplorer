import { create } from 'zustand'

export const useScenarioStore = create((set) => ({
  scenario: null,   // current scenario config object
  isDirty: false,   // unsaved local changes

  setScenario: (scenario) => set({ scenario, isDirty: false }),
  updateScenario: (patch) =>
    set((s) => ({ scenario: { ...s.scenario, ...patch }, isDirty: true })),
  clearScenario: () => set({ scenario: null, isDirty: false }),
}))
