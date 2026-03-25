const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT = 30_000

// Structured error thrown for any non-2xx response
export class ApiError extends Error {
  constructor(status, message, details = null, code = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.code = code // e.g. "VALIDATION_ERROR", "NOT_FOUND", "INTERNAL_ERROR"
  }

  get isValidation() { return this.status === 422 }
  get isNotFound() { return this.status === 404 }
  get isForbidden() { return this.status === 403 }
  get isServerError() { return this.status >= 500 }
  get isUnauthorized() { return this.status === 401 }
}

// Thrown when the network is unreachable or the request times out
export class NetworkError extends Error {
  constructor(message, cause = null) {
    super(message)
    this.name = 'NetworkError'
    this.cause = cause
  }
}

/**
 * Parse an ApiError into user-friendly messages.
 * For 422 validation errors, returns field-level messages.
 */
export function parseApiError(err) {
  if (err instanceof NetworkError) {
    return {
      title: 'Connection error',
      message: err.message,
      fields: null,
    }
  }

  if (!(err instanceof ApiError)) {
    return {
      title: 'Unexpected error',
      message: err?.message || 'Something went wrong.',
      fields: null,
    }
  }

  // Pydantic validation errors → field-level messages
  if (err.isValidation && err.details?.errors) {
    const fields = {}
    for (const e of err.details.errors) {
      const field = (e.loc || []).filter((l) => l !== 'body').join('.')
      const key = field || '_root'
      if (!fields[key]) fields[key] = []
      fields[key].push(e.msg)
    }
    return {
      title: 'Validation error',
      message: 'Please fix the highlighted fields.',
      fields,
    }
  }

  if (err.isNotFound) {
    return {
      title: 'Not found',
      message: err.message,
      fields: null,
    }
  }

  if (err.isServerError) {
    return {
      title: 'Server error',
      message: 'The server encountered an unexpected problem. Please try again.',
      fields: null,
    }
  }

  return {
    title: 'Request failed',
    message: err.message,
    fields: null,
  }
}


async function request(path, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...fetchOptions.headers },
      signal: controller.signal,
      ...fetchOptions,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new NetworkError('Request timed out. The server may be slow or unreachable.')
    }
    throw new NetworkError(
      'Unable to reach the server. Check your connection and try again.',
      err,
    )
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    let body = null
    try {
      body = await res.json()
    } catch {
      // response body not JSON — ignore
    }

    // Future auth: detect 401 and dispatch event for global handling
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }

    throw new ApiError(
      res.status,
      body?.error?.message ?? body?.message ?? `HTTP ${res.status}`,
      body?.error?.details ?? body?.details ?? null,
      body?.error?.error_code ?? null,
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
  health: () => request('/api/health', { timeout: 5000 }),
  version: () => request('/api/version'),
}
