import { History } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ComingSoon from '../components/ui/ComingSoon'

export default function RunsPage() {
  return (
    <>
      <PageHeader
        icon={History}
        title="Run History"
        description="Browse every simulation you have run and reopen or re-execute any previous run."
        accent="sky"
        badge="Phase 8"
      />

      <ComingSoon
        icon={History}
        title="Run history is coming in Phase 8"
        description="Every simulation run will be logged here with its input, algorithm, and timeline. You can reopen any past run to review its full step-by-step execution."
        features={[
          'Full log of every run with timestamp and algorithm',
          'Reopen a past run to replay its timeline',
          'Rerun a past scenario with the same inputs',
          'Filter by algorithm domain, date, or status',
        ]}
      />
    </>
  )
}
