import { Tabs, TabList, Tab, TabPanel } from '../ui'
import DeltaMetricsTable from './DeltaMetricsTable'
import CommentaryPanel from './CommentaryPanel'

export default function ComparisonBottomPanel({ slots, deltaMetrics, commentary, onJumpToStep }) {
  return (
    <div className = "rounded-xl border border-white/[0.07] bg-slate-800/50 overflow-hidden">
      <Tabs defaultValue = "metrics">
        <div className = "border-b border-white/[0.07] px-4">
          <TabList>
            <Tab value = "metrics">Delta Metrics</Tab>
            <Tab value = "commentary">Commentary</Tab>
          </TabList>
        </div>

        <TabPanel value = "metrics">
          <DeltaMetricsTable slots = {slots} deltaMetrics = {deltaMetrics} />
        </TabPanel>

        <TabPanel value = "commentary">
          <CommentaryPanel commentary = {commentary} onJumpToStep = {onJumpToStep} />
        </TabPanel>
      </Tabs>
    </div>
  )
}
