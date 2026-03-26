function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function safeJsonParse(raw, fallback = null) {
  if (typeof raw !== 'string') return fallback

  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function safeJsonStringify(value, label = 'payload') {
  try {
    return JSON.stringify(value)
  } catch (err) {
    throw new Error(`Unable to serialize ${label}.`, { cause: err })
  }
}

function normalizeScenarioTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))]
}

export function normalizeGuestScenario(value) {
  if (!isPlainObject(value)) return null
  if (typeof value.id !== 'string' || !value.id) return null
  if (typeof value.name !== 'string' || !value.name.trim()) return null
  if (typeof value.module_type !== 'string' || !value.module_type) return null
  if (typeof value.algorithm_key !== 'string' || !value.algorithm_key) return null
  if (!isPlainObject(value.input_payload)) return null

  return {
    id: value.id,
    name: value.name.trim(),
    module_type: value.module_type,
    algorithm_key: value.algorithm_key,
    input_payload: value.input_payload,
    algorithm_config: isPlainObject(value.algorithm_config) ? value.algorithm_config : null,
    tags: normalizeScenarioTags(value.tags),
    created_at: typeof value.created_at === 'string' && value.created_at ? value.created_at : new Date().toISOString(),
  }
}

export function normalizeGuestRun(value) {
  if (!isPlainObject(value)) return null
  if (typeof value.id !== 'string' || !value.id) return null
  if (typeof value.run_id !== 'number' || !Number.isFinite(value.run_id)) return null
  if (typeof value.module_type !== 'string' || !value.module_type) return null
  if (typeof value.algorithm_key !== 'string' || !value.algorithm_key) return null
  if (!isPlainObject(value.summary)) return null
  if (!isPlainObject(value.config)) return null

  return {
    id: value.id,
    run_id: value.run_id,
    module_type: value.module_type,
    algorithm_key: value.algorithm_key,
    summary: value.summary,
    config: value.config,
    created_at: typeof value.created_at === 'string' && value.created_at ? value.created_at : new Date().toISOString(),
  }
}

export const GUEST_PERSISTENCE_VERSION = 2
export const SCENARIO_EXPORT_VERSION = 1
export const AUTH_PERSISTENCE_VERSION = 1

export function migrateGuestState(persistedState, version) {
  const state = isPlainObject(persistedState) ? persistedState : {}

  const scenarios = Array.isArray(state.scenarios)
    ? state.scenarios.map(normalizeGuestScenario).filter(Boolean)
    : []

  const runs = Array.isArray(state.runs)
    ? state.runs.map(normalizeGuestRun).filter(Boolean)
    : []

  // Preserve future migrations with an explicit branch, even if v0/v1 shapes are identical.
  if (version < GUEST_PERSISTENCE_VERSION) {
    return { scenarios, runs }
  }

  return { scenarios, runs }
}

export function migrateAuthState(persistedState) {
  const state = isPlainObject(persistedState) ? persistedState : {}

  return {
    accessToken: typeof state.accessToken === 'string' && state.accessToken ? state.accessToken : null,
    user: isPlainObject(state.user) ? state.user : null,
  }
}

export function buildScenarioExportDocument(scenarios) {
  return {
    schema_version: SCENARIO_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    scenarios: scenarios.map(normalizeGuestScenario).filter(Boolean),
  }
}

export function parseScenarioImportDocument(json) {
  const parsed = safeJsonParse(json, null)
  if (parsed == null) {
    throw new Error('Invalid JSON.')
  }

  const scenarios = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.scenarios)
      ? parsed.scenarios
      : null

  if (!scenarios) {
    throw new Error('Expected an array of scenarios.')
  }

  const normalized = scenarios.map(normalizeGuestScenario).filter(Boolean)
  return normalized
}
