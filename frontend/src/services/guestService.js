
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const guestService = {
  createScenario: ({ name, moduleType, algorithmKey, inputPayload, algorithmConfig = null, tags = [] }) => ({
    id: generateId(),
    name,
    module_type: moduleType,
    algorithm_key: algorithmKey,
    input_payload: inputPayload,
    algorithm_config: algorithmConfig,
    tags,
    created_at: new Date().toISOString(),
  }),

  createRunItem: ({ runId, moduleType, algorithmKey, summary, config }) => ({
    id: generateId(),
    run_id: runId,
    module_type: moduleType,
    algorithm_key: algorithmKey,
    summary,
    config,
    created_at: new Date().toISOString(),
  }),


  exportScenarios: (scenarios) => JSON.stringify(scenarios, null, 2),

  importScenarios: (json) => {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) throw new Error('Expected an array of scenarios')
    return parsed.map((s) => ({
      ...s,
      id: s.id ?? generateId(),
      created_at: s.created_at ?? new Date().toISOString(),
    }))
  },
}
