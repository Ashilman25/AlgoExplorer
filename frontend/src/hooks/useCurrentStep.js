import { usePlaybackStore } from '../stores/usePlaybackStore'

//returns current timeline step obj
export function useCurrentStep() {
  return usePlaybackStore((s) => s.currentStep)
}
