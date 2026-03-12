import { client } from './client'

export const benchmarksService = {
  // GET /api/benchmarks/ → BenchmarkStatusResponse[]
  listJobs: () => client.get('/api/benchmarks/'),

  // POST /api/benchmarks/ → BenchmarkStatusResponse
  // body: { module_type, config }
  createJob: (body) => client.post('/api/benchmarks/', body),

  // PATCH /api/benchmarks/:benchmarkId/status → BenchmarkStatusResponse
  // body: { status, progress }
  updateStatus: (benchmarkId, body) =>
    client.patch(`/api/benchmarks/${benchmarkId}/status`, body),

  // GET /api/benchmarks/:benchmarkId/results → BenchmarkResultsResponse
  getResults: (benchmarkId) => client.get(`/api/benchmarks/${benchmarkId}/results`),
}
