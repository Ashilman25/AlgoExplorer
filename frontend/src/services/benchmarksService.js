import { client } from './client'

export const benchmarksService = {
  // GET /api/benchmarks/ → BenchmarkStatusResponse[]
  listJobs: () => client.get('/api/benchmarks/'),

  // POST /api/benchmarks/ → BenchmarkStatusResponse
  // body: { module_type, algorithm_keys, input_family, sizes, trials_per_size, metrics }
  createJob: (body) => client.post('/api/benchmarks/', body),

  // GET /api/benchmarks/:benchmarkId → BenchmarkStatusResponse
  getJob: (benchmarkId) => client.get(`/api/benchmarks/${benchmarkId}`),

  // PATCH /api/benchmarks/:benchmarkId/status → BenchmarkStatusResponse
  // body: { status, progress }
  updateStatus: (benchmarkId, body) =>
    client.patch(`/api/benchmarks/${benchmarkId}/status`, body),

  // GET /api/benchmarks/:benchmarkId/results → BenchmarkResultsResponse
  // { id, status, summary, series: { [metric]: AlgorithmSeries[] }, table: TableRow[] }
  getResults: (benchmarkId) => client.get(`/api/benchmarks/${benchmarkId}/results`),

  // POST /api/benchmarks/:benchmarkId/cancel → BenchmarkStatusResponse
  cancelJob: (benchmarkId) => client.post(`/api/benchmarks/${benchmarkId}/cancel`),

  // GET /api/benchmarks/workers/health → WorkerHealthResponse
  getWorkerHealth: () => client.get('/api/benchmarks/workers/health'),
}
