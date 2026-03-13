import { BarChart3, Play } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select, Slider } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'

const SORT_ALGOS = [
  {value: 'quicksort', label: 'Quick Sort'},
  {value: 'mergesort', label: 'Merge Sort'},
]

const DISTRIBUTIONS = [
  {value: 'random', label: 'Random'},
  {value: 'nearly_sorted', label: 'Nearly Sorted'},
  {value: 'reversed', label: 'Reversed'},
  {value: 'few_unique', label: 'Few Unique'},
]

const SORTING_METRICS = [
  {label: 'Comparisons', value: '—'},
  {label: 'Swaps', value: '—'},
  {label: 'Array accesses', value: '—'},
]

function SortingConfig() {
  return (
    <ConfigPanel title = "Sorting Lab">

      <ConfigSection title = "Algorithm">
        <Select options = {SORT_ALGOS} />
      </ConfigSection>

      <ConfigSection title = "Input">
        <Slider
          label = "Array Size"
          min = {5} max = {100} step = {5}
          value = {20}
          formatValue = {(v) => `${v} elements`}
        />

        <Select label = "Distribution" options = {DISTRIBUTIONS} />
      </ConfigSection>

      <ConfigSection title = "Options">
        <Slider
          label = "Step Speed"
          min = {1} max = {5} step = {1}
          value = {3}
          formatValue = {(v) => ['Slowest', 'Slow', 'Normal', 'Fast', 'Fastest'][v - 1]}
        />
      </ConfigSection>

      <ConfigSection>
        <Button variant = "primary" size = "md" icon = {Play} className = "w-full">
          Run Simulation
        </Button>

        <Button variant = "ghost" size = "md" className = "w-full text-slate-500">
          Reset
        </Button>
      </ConfigSection>

    </ConfigPanel>
  )
}

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

      <SimulationLayout configPanel = {<SortingConfig />} metrics = {SORTING_METRICS}>

        <div className = "flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className = "text-sm font-medium text-slate-500">
            Sorting canvas — array bars render here
          </p>

          <p className = "text-xs text-slate-600 max-w-xs leading-relaxed">
            Configure array size and distribution, then step through the sort.
          </p>

          <div className = "flex gap-2 mt-1">
            {['Quick Sort', 'Merge Sort'].map((alg) => (
              <span
                key = {alg}
                className = "text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-500 border border-white/[0.06]"
              >
                {alg}
              </span>
            ))}
          </div>
        </div>
      </SimulationLayout>
    </>
  )
}
