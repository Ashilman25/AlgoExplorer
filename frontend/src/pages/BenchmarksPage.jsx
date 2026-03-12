import { Gauge } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ComingSoon from '../components/ui/ComingSoon'

export default function BenchmarksPage() {
  return (
    <>
      <PageHeader
        icon = {Gauge}
        title = "Benchmark Lab"
        description = "Measure algorithm runtime across input sizes and visualize how performance scales."
        accent = "emerald"
        badge = "Phase 9"
      />

      <ComingSoon
        icon = {Gauge}
        title = "Benchmark lab is coming in Phase 9"
        description = "Configure an algorithm, sweep across input sizes, and see runtime curves plotted in real time. Export results as CSV or JSON for further analysis."
        features = {[
          'Input-size sweep from small to large datasets',
          'Repeated trials with aggregated statistics',
          'Runtime and operation-count charts',
          'Side-by-side algorithm comparison on the same sweep',
          'Exportable results (CSV/JSON)',
        ]}
      />
    </>
  )
}
