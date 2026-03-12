import { Network } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import LabShell from '../components/layout/LabShell'

export default function GraphLabPage() {
  return (
    <>
      <PageHeader
        icon = {Network}
        title = "Graph Lab"
        description = "Visualize BFS and Dijkstra's algorithm executing step by step on an interactive graph canvas."
        accent = "brand"
        badge = "Phase 5"
      />
      <LabShell
        domain = "graph"
        algorithms = {['BFS', 'Dijkstra']}
        canvasLabel = "Graph canvas — nodes and edges render here"
        canvasNote = "Build your graph, set source and target, then run the simulation."
      />
    </>
  )
}
