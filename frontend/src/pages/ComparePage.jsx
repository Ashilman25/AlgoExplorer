import { Columns2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ComingSoon from '../components/ui/ComingSoon'

export default function ComparePage() {
  return (
    <>
      <PageHeader
        icon = {Columns2}
        title = "Compare"
        description = "Run two algorithms side by side on identical inputs and compare their execution step by step."
        accent = "violet"
        badge = "Phase 13"
      />

      <ComingSoon
        icon = {Columns2}
        title = "Comparison mode is coming in Phase 13"
        description = "Load any two algorithms from the same domain, feed them the same input, and watch them run in synchronized or independent playback side by side."
        features = {[
          'Side-by-side simulation panels with shared input',
          'Synchronized or independent step playback',
          'Comparative metrics table (comparisons, swaps, path length, etc.)',
          'Highlight divergence points between algorithms',
        ]}
      />
    </>
  )
}
