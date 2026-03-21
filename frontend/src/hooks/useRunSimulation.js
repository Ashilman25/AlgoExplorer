import { useCallback, useState } from 'react'
import { useRunStore } from '../stores/useRunStore'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useGuestStore } from '../stores/useGuestStore'
import { runsService } from '../services/runsService'
import { guestService } from '../services/guestService'

// usage:
// const {run, isRunning} = useRunSimulation()
// run({ module_type, algorithm_key, input_payload, execution_mode, explanation_level })


export function useRunSimulation() {
  const [isRunning, setIsRunning] = useState(false)

  const {setRun, clearRun, setLoading: setRunLoading, setError: setRunError} = useRunStore()
  const {setTimeline, clearTimeline, setLoading: setTimelineLoading, setError: setTimelineError, play} = usePlaybackStore()
  const saveRun = useGuestStore((s) => s.saveRun)

  const run = useCallback(async (request) => {
    setIsRunning(true)
    clearRun()
    clearTimeline()
    setRunLoading(true)
    setTimelineLoading(true)

    try {
      // POST /api/runs/
      const runResponse = await runsService.createRun(request)
      setRun(runResponse.id, runResponse)
      setRunLoading(false)

      // GET /api/runs/:id/timeline
      const timelineResponse = await runsService.getTimeline(runResponse.id)
      setTimeline(timelineResponse.steps)
      setTimelineLoading(false)
      play()

      // persist to guest run history
      saveRun(guestService.createRunItem({
        runId: runResponse.id,
        moduleType: request.module_type,
        algorithmKey: request.algorithm_key,
        summary: runResponse.summary,
        config: {
          input_payload: request.input_payload,
          algorithm_config: request.algorithm_config,
          execution_mode: request.execution_mode,
          explanation_level: request.explanation_level,
        },
      }))

    } catch (err) {
      const message = err?.message ?? 'Simulation failed.'

      setRunError(message)
      setTimelineError(message)

    } finally {
      setIsRunning(false)
    }

  }, [clearRun, clearTimeline, setRun, setRunError, setRunLoading, setTimeline, setTimelineError, setTimelineLoading, play, saveRun])

  return {run, isRunning}
}