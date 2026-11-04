// The one place that knows how to talk to the backend.
// Requests go to the same origin under /api; Vite (dev) or nginx (Docker)
// forwards them to FastAPI.
export const API_BASE = '/api'

/** An error response from the API, with a message that is safe to show users. */
export class ApiError extends Error {
  readonly status: number
  /** Field-level messages from a 422 response, keyed by field name. */
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface ValidationIssue {
  loc: (string | number)[]
  msg: string
}

/** Turn FastAPI's `{detail: ...}` body into an ApiError. */
function toApiError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') {
    return new ApiError(status, detail)
  }
  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of detail as ValidationIssue[]) {
      const field = String(issue.loc[issue.loc.length - 1])
      // Pydantic prefixes custom messages with "Value error, ".
      fieldErrors[field] = issue.msg.replace(/^Value error, /, '')
    }
    const first = Object.values(fieldErrors)[0] ?? 'Please check the highlighted fields.'
    return new ApiError(status, first, fieldErrors)
  }
  if (status === 502 || status === 503 || status === 504) {
    return new ApiError(status, 'The Aster API is not reachable right now. Is the backend running?')
  }
  return new ApiError(status, `The server responded with an unexpected error (${status}).`)
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Could not reach the Aster API. Is the backend running?')
  }

  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // Not JSON: e.g. a plain-text 500 or an nginx 502 page while the API restarts.
    if (response.ok) throw new ApiError(response.status, 'The server sent an unreadable response.')
  }
  if (!response.ok) {
    throw toApiError(response.status, body)
  }
  return body as T
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}
