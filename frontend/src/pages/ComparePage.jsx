import { useState, useCallback, useEffect } from 'react'
import { Columns2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { useComparisonStore } from '../stores/useComparisonStore'
import { computeDeltaMetrics } from '../utils/comparisonUtils'
import {
  ComparisonConfigPanel,
  ComparisonPlaybackBar,
  ComparisonBottomPanel,
  SlotPanel,
} from '../components/comparison'

function gridClass(count) {
  if (count <= 2) return 'grid-cols-2'
  if (count === 3) return 'grid-cols-3'
  return 'grid-cols-2'
}

export default function ComparePage() {
  const slots        = useComparisonStore((s) => s.slots)
  const moduleType   = useComparisonStore((s) => s.moduleType)
  const inputPayload = useComparisonStore((s) => s.inputPayload)
  const stepIndex    = useComparisonStore((s) => s.stepIndex)
  const maxSteps     = useComparisonStore((s) => s.maxSteps)
  const deltaMetrics = useComparisonStore((s) => s.deltaMetrics)
  const commentary   = useComparisonStore((s) => s.commentary)
  const { jumpTo, rerunSlot, runAll } = useComparisonStore()

  const [isRunning, setIsRunning] = useState(false)

  // Recompute delta metrics on step change
  useEffect(() => {
    const readySlots = slots.filter((s) => s.status === 'ready')
    if (readySlots.length < 2 || !moduleType) return

    const updated = computeDeltaMetrics(readySlots, stepIndex, moduleType)
    useComparisonStore.setState({ deltaMetrics: updated })
  }, [stepIndex, slots, moduleType])

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    try {
      await runAll()
    } finally {
      setIsRunning(false)
    }
  }, [runAll])

  const handleRetry = useCallback(
    (slotId) => () => rerunSlot(slotId),
    [rerunSlot]
  )

  const readySlots = slots.filter((s) => s.status === 'ready')
  const hasResults = readySlots.length >= 2

  return (
    <div className = "flex flex-col gap-4 animate-enter stagger-1">
      <PageHeader
        icon = {Columns2}
        title = "Compare"
        description = "Run algorithms side by side on identical inputs and compare their execution."
        accent = "violet"
      />

      <ComparisonConfigPanel isRunning = {isRunning} onRun = {handleRun} />

      {slots.length > 0 && (
        <div className = {`grid ${gridClass(slots.length)} gap-3`} style = {{ minHeight: '360px' }}>
          {slots.map((slot) => (
            <SlotPanel
              key = {slot.id}
              slot = {slot}
              stepIndex = {stepIndex}
              maxSteps = {maxSteps}
              moduleType = {moduleType}
              inputPayload = {inputPayload}
              onRetry = {handleRetry(slot.id)}
            />
          ))}
        </div>
      )}

      {hasResults && <ComparisonPlaybackBar />}

      {hasResults && (
        <ComparisonBottomPanel
          slots = {slots}
          deltaMetrics = {deltaMetrics}
          commentary = {commentary}
          onJumpToStep = {jumpTo}
        />
      )}
    </div>
  )
}
