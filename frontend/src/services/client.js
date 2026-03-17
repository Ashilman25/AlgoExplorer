const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Structured error thrown for any non-2xx response
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!res.ok) {
    let body = null
    try {
      body = await res.json()
    } catch {
      // response body not JSON — ignore
    }
    throw new ApiError(
      res.status,
      body?.error?.message ?? body?.message ?? `HTTP ${res.status}`,
      body?.error?.details ?? body?.details ?? null,
    )
  }

  if (res.status === 204) return null
  return res.json()
}

export const client = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  // System endpoints
  health: () => request('/api/health'),
  version: () => request('/api/version'),
}
