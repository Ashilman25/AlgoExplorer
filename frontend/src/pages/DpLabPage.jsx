import { Grid3x3 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import LabShell from '../components/layout/LabShell'

export default function DpLabPage() {
  return (
    <>
      <PageHeader
        icon = {Grid3x3}
        title = "DP Lab"
        description = "Explore LCS and Edit Distance through cell-by-cell DP table construction with traceback overlays."
        accent = "violet"
        badge = "Phase 7"
      />
      <LabShell
        domain = "dp"
        algorithms = {['LCS', 'Edit Distance']}
        canvasLabel = "DP table — cells fill in as the algorithm progresses"
        canvasNote = "Enter your input strings, then step through the recurrence relation."
      />
    </>
  )
}
