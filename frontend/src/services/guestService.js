
import {
  buildScenarioExportDocument,
  parseScenarioImportDocument,
} from './persistenceService'

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

  exportScenarios: (scenarios) => JSON.stringify(buildScenarioExportDocument(scenarios), null, 2),

  importScenarios: (json) =>
    parseScenarioImportDocument(json).map((scenario) => ({
      ...scenario,
      id: scenario.id ?? generateId(),
      created_at: scenario.created_at ?? new Date().toISOString(),
    })),
}
