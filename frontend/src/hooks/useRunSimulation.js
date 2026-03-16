import { useCallback, useState } from 'react'
import { useRunStore } from '../stores/useRunStore'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { runsService } from '../services/runsService'

// usage:
// const {run, isRunning} = useRunSimulation()
// run({ module_type, algorithm_key, input_payload, execution_mode, explanation_level })


export function useRunSimulation() {
  const [isRunning, setIsRunning] = useState(false)

  const {setRun, clearRun, setLoading: setRunLoading, setError: setRunError} = useRunStore()
  const {setTimeline, clearTimeline, setLoading: setTimelineLoading, setError: setTimelineError, play} = usePlaybackStore()

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

    } catch (err) {
      const message = err?.message ?? 'Simulation failed.'

      setRunError(message)
      setTimelineError(message)

    } finally {
      setIsRunning(false)
    }

  }, [clearRun, clearTimeline, setRun, setRunError, setRunLoading, setTimeline, setTimelineError, setTimelineLoading, play])

  return {run, isRunning}
}