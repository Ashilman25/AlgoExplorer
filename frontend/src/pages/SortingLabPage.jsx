import { BarChart3 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import LabShell from '../components/layout/LabShell'

export default function SortingLabPage() {
  return (
    <>
      <PageHeader
        icon = {BarChart3}
        title = "Sorting Lab"
        description = "Watch Quick Sort and Merge Sort work through arrays with comparison, swap, and partition tracking."
        accent = "amber"
        badge = "Phase 6"
      />
      <LabShell
        domain = "sorting"
        algorithms = {['Quick Sort', 'Merge Sort']}
        canvasLabel = "Sorting canvas — array bars render here"
        canvasNote = "Configure array size and distribution, then step through the sort."
      />
    </>
  )
}
