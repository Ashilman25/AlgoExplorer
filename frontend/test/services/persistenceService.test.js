import {
  AUTH_PERSISTENCE_VERSION,
  GUEST_PERSISTENCE_VERSION,
  buildScenarioExportDocument,
  migrateAuthState,
  migrateGuestState,
  parseScenarioImportDocument,
  safeJsonParse,
} from '../../src/services/persistenceService'


describe('persistenceService', () => {
  it('returns the fallback for invalid JSON', () => {
    expect(safeJsonParse('{bad json', { ok: false })).toEqual({ ok: false })
  })

  it('migrates guest state and drops invalid records', () => {
    const migrated = migrateGuestState(
      {
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Quick Sort',
            module_type: 'sorting',
            algorithm_key: 'quicksort',
            input_payload: { array: [3, 1, 2] },
            tags: [' smoke ', 'smoke'],
          },
          { id: 'invalid-scenario' },
        ],
        runs: [
          {
            id: 'run-1',
            run_id: 42,
            module_type: 'sorting',
            algorithm_key: 'quicksort',
            summary: { comparisons: 5 },
            config: { input_payload: { array: [3, 1, 2] } },
          },
          { id: 'invalid-run' },
        ],
      },
      GUEST_PERSISTENCE_VERSION - 1,
    )

    expect(migrated.scenarios).toHaveLength(1)
    expect(migrated.scenarios[0].tags).toEqual(['smoke'])
    expect(migrated.runs).toHaveLength(1)
    expect(migrated.runs[0].run_id).toBe(42)
  })

  it('migrates auth state defensively', () => {
    expect(
      migrateAuthState({ accessToken: 'token-1', user: { id: 7, username: 'andrew' } }, AUTH_PERSISTENCE_VERSION - 1),
    ).toEqual({
      accessToken: 'token-1',
      user: { id: 7, username: 'andrew' },
    })

    expect(migrateAuthState({ accessToken: 123, user: 'bad' })).toEqual({
      accessToken: null,
      user: null,
    })
  })

  it('builds a versioned scenario export document', () => {
    const document = buildScenarioExportDocument([
      {
        id: 'scenario-1',
        name: 'Edit Distance',
        module_type: 'dp',
        algorithm_key: 'edit_distance',
        input_payload: { string1: 'kitten', string2: 'sitting' },
        tags: [],
      },
    ])

    expect(document.schema_version).toBe(1)
    expect(document.scenarios).toHaveLength(1)
    expect(document.exported_at).toBeTruthy()
  })

  it('imports both legacy arrays and versioned export envelopes', () => {
    const legacy = JSON.stringify([
      {
        id: 'scenario-legacy',
        name: 'Legacy scenario',
        module_type: 'sorting',
        algorithm_key: 'quicksort',
        input_payload: { array: [5, 2, 1] },
      },
    ])

    const versioned = JSON.stringify({
      schema_version: 1,
      scenarios: [
        {
          id: 'scenario-versioned',
          name: 'Versioned scenario',
          module_type: 'graph',
          algorithm_key: 'dijkstra',
          input_payload: { nodes: [{ id: 'A' }], edges: [] },
        },
      ],
    })

    expect(parseScenarioImportDocument(legacy)).toHaveLength(1)
    expect(parseScenarioImportDocument(versioned)).toHaveLength(1)
  })

  it('rejects malformed scenario import payloads', () => {
    expect(() => parseScenarioImportDocument('{bad json')).toThrow('Invalid JSON.')
    expect(() => parseScenarioImportDocument(JSON.stringify({ nope: [] }))).toThrow(
      'Expected an array of scenarios.',
    )
  })
})
