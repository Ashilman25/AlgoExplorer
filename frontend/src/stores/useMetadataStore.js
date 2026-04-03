import { create } from 'zustand'

export const useMetadataStore = create((set, get) => ({
  modules: [],
  algorithms: {}, // { [moduleKey]: AlgorithmMeta[] }
  presets: {},    // { [moduleKey]: PresetMeta[] }  — legacy module-level presets
  presetCache: {}, // { "moduleType/algorithmKey": PresetItem[] } — API-driven preset cache
  isLoading: false,
  error: null,

  setMetadata: ({ modules, algorithms, presets }) =>
    set({ modules, algorithms, presets }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () => set({ modules: [], algorithms: {}, presets: {}, presetCache: {}, error: null }),

  setPresets: (moduleType, algorithmKey, presets) =>
    set((state) => ({
      presetCache: {
        ...state.presetCache,
        [`${moduleType}/${algorithmKey ?? '_all'}`]: presets,
      },
    })),

  getPresets: (moduleType, algorithmKey) => {
    const cache = get().presetCache
    return cache[`${moduleType}/${algorithmKey ?? '_all'}`] ?? null
  },
}))
