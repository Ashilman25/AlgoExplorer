import { create } from 'zustand'

export const useSelectionStore = create((set) => ({
  moduleKey: null,     //graph, sorting, dp
  algorithmKey: null,  //bfs, quicksort, ..

  setModule: (moduleKey) => set({ moduleKey, algorithmKey: null }),
  setAlgorithm: (algorithmKey) => set({ algorithmKey }),
  reset: () => set({ moduleKey: null, algorithmKey: null }),
}))
