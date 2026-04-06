import { Tabs, TabList, Tab, TabPanel } from '../ui'
import DeltaMetricsTable from './DeltaMetricsTable'
import CommentaryPanel from './CommentaryPanel'

export default function ComparisonBottomPanel({ slots, deltaMetrics, commentary, onJumpToStep }) {
  return (
    <div className = "rounded-xl border border-hairline bg-surface-translucent overflow-hidden">
      <Tabs defaultValue = "metrics">
        <div className = "border-b border-hairline px-4">
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
