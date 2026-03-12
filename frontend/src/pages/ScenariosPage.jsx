import { BookMarked, Search, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ComingSoon from '../components/ui/ComingSoon'

export default function ScenariosPage() {
  return (
    <>
      <PageHeader
        icon = {BookMarked}
        title = "Scenario Library"
        description = "Save and reload your custom algorithm inputs, presets, and configurations across sessions."
        accent = "sky"
        badge = "Phase 8"
      >
        <button className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 text-slate-400 border border-white/[0.07] cursor-not-allowed opacity-50">
          <Search size = {12} strokeWidth = {1.5} />
          Search
        </button>

        <button className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 text-slate-400 border border-white/[0.07] cursor-not-allowed opacity-50">
          <Plus size = {12} strokeWidth = {1.5} />
          New
        </button>
      </PageHeader>

      <ComingSoon
        icon = {BookMarked}
        title = "Scenario library is coming in Phase 8"
        description = "Once the algorithm labs are built, you will be able to save named scenarios — your custom graphs, arrays, and DP inputs — and reload them instantly from this library."
        features = {[
          'Save and name any algorithm input as a scenario',
          'Browse and search across all saved scenarios',
          'Load a scenario directly into any lab',
          'Guest-local persistence via browser storage (no account required)',
        ]}
      />
    </>
  )
}
