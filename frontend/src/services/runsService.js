import { client } from './client'

export const runsService = {
  // POST /api/runs/ → CreateRunResponse
  // body: { module_type, algorithm_key, input_payload, algorithm_config?,
  //         execution_mode, explanation_level, scenario_id? }
  createRun: (body) => client.post('/api/runs/', body),

  // GET /api/runs/:runId → RunSummary
  getRun: (runId) => client.get(`/api/runs/${runId}`),

  // GET /api/runs/:runId/timeline → TimelineResponse
  getTimeline: (runId) => client.get(`/api/runs/${runId}/timeline`),
}
