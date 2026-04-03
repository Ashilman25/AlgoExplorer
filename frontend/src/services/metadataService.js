import { client } from './client'

export const metadataService = {
  // GET /api/metadata/modules → MetadataResponse { modules: ModuleMetadata[] }
  getModules: () => client.get('/api/metadata/modules'),

  // GET /api/metadata/modules/:moduleKey → ModuleMetadata
  getModule: (moduleKey) => client.get(`/api/metadata/modules/${moduleKey}`),

  // GET /api/metadata/modules/:moduleKey/algorithms/:algorithmKey → AlgorithmMetadata
  getAlgorithm: (moduleKey, algorithmKey) =>
    client.get(`/api/metadata/modules/${moduleKey}/algorithms/${algorithmKey}`),

  // GET /api/presets/:moduleType[?algorithm_key=...] → PresetsResponse
  getPresets: (moduleType, algorithmKey) =>
    client.get(
      `/api/presets/${moduleType}${algorithmKey ? `?algorithm_key=${algorithmKey}` : ''}`
    ),
}
