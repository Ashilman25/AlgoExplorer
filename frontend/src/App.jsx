import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import HomePage from './pages/HomePage'
import GraphLabPage from './pages/GraphLabPage'
import SortingLabPage from './pages/SortingLabPage'
import DpLabPage from './pages/DpLabPage'
import ScenariosPage from './pages/ScenariosPage'
import RunsPage from './pages/RunsPage'
import BenchmarksPage from './pages/BenchmarksPage'
import ComparePage from './pages/ComparePage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route element = {<AppShell />}>
          <Route index element = {<HomePage />} />
          <Route path = "graph" element = {<GraphLabPage />} />
          <Route path = "sorting" element = {<SortingLabPage />} />
          <Route path = "dp" element = {<DpLabPage />} />
          <Route path = "scenarios" element = {<ScenariosPage />} />
          <Route path = "runs" element = {<RunsPage />} />
          <Route path = "benchmarks" element = {<BenchmarksPage />} />
          <Route path = "compare" element = {<ComparePage />} />
          <Route path = "*" element = {<NotFoundPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}
