import { useEffect } from 'react'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { runsService } from '../services/runsService'
import { useToast } from '../components/ui/Toast'


export function useReopenRun(reopenRunId, timingConfig) {
  const toast = useToast()

  useEffect(() => {
    if (!reopenRunId) return

    const rid = String(reopenRunId)
    const { runId: currentRunId } = useRunStore.getState()
    const { totalSteps, jumpToStart } = usePlaybackStore.getState()

    if (String(currentRunId) === rid && totalSteps > 0) {
      jumpToStart()
      return
    }


    let cancelled = false
    usePlaybackStore.getState().setLoading(true)

    ;(async () => {
      try {
        const [summary, timeline] = await Promise.all([
          runsService.getRun(reopenRunId),
          runsService.getTimeline(reopenRunId),
        ])
        if (cancelled) return

        const steps = timeline.steps
        if (!Array.isArray(steps) || steps.length === 0) {
          throw new Error('Empty timeline')
        }

        useRunStore.getState().setRun(reopenRunId, summary)
        usePlaybackStore.getState().setTimeline(steps, timingConfig)
        usePlaybackStore.getState().play()
      } catch {
        if (!cancelled) {
          usePlaybackStore.getState().clearTimeline()
          useRunStore.getState().clearRun()
          toast({
            type: 'error',
            title: 'Could not load run',
            message: 'The timeline is no longer available. You can rerun the simulation.',
          })
        }
      } finally {
        if (!cancelled) usePlaybackStore.getState().setLoading(false)
      }
    })()

    return () => { cancelled = true }
  // timingConfig intentionally excluded — derived from loadedScenario
  // which is stable (useState initializer). Only re-run on reopenRunId change.
  }, [reopenRunId]) // eslint-disable-line react-hooks/exhaustive-deps
}
