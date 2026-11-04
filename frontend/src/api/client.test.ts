import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './client'

function mockFetch(status: number, body: string) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status })))
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('expected the request to fail')
}

afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch(200, '{"status":"ok"}')
    await expect(request('/health')).resolves.toEqual({ status: 'ok' })
  })

  it('returns null for an empty or JSON-null body', async () => {
    mockFetch(200, 'null')
    await expect(request('/accounts/x/cards')).resolves.toBeNull()
  })

  it('uses FastAPI string details as the message', async () => {
    mockFetch(409, '{"detail":"An account with the email a@b.co already exists."}')
    const error = await caught(request('/accounts'))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.message).toBe('An account with the email a@b.co already exists.')
  })

  it('maps 422 validation issues to fields', async () => {
    mockFetch(422, JSON.stringify({ detail: [{ loc: ['body', 'email'], msg: 'Value error, Enter a valid email address.' }] }))
    const error = await caught(request('/accounts'))
    expect(error.fieldErrors).toEqual({ email: 'Enter a valid email address.' })
    expect(error.message).toBe('Enter a valid email address.')
  })

  it('handles a plain-text 500 without crashing on JSON.parse', async () => {
    mockFetch(500, 'Internal Server Error')
    const error = await caught(request('/accounts'))
    expect(error.status).toBe(500)
    expect(error.message).toBe('The server responded with an unexpected error (500).')
  })

  it('explains an HTML 502 from the proxy', async () => {
    mockFetch(502, '<html><body>502 Bad Gateway</body></html>')
    const error = await caught(request('/accounts'))
    expect(error.message).toMatch(/not reachable/)
  })

  it('explains a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const error = await caught(request('/accounts'))
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/Could not reach/)
  })
})
