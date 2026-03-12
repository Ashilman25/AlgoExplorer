import { create } from 'zustand'

export const useMetadataStore = create((set) => ({
  modules: [],
  algorithms: {}, // { [moduleKey]: AlgorithmMeta[] }
  presets: {},    // { [moduleKey]: PresetMeta[] }
  isLoading: false,
  error: null,

  setMetadata: ({ modules, algorithms, presets }) =>
    set({ modules, algorithms, presets }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () => set({ modules: [], algorithms: {}, presets: {}, error: null }),
}))
