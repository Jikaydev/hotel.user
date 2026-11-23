export type ApiService = 'hotels' | 'bookings' | 'payments'

type ApiErrorBody = {
  message?: string
  error?: string
  code?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  token?: string | null
}

const serviceEnvironmentKeys: Record<ApiService, string> = {
  hotels: 'NEXT_PUBLIC_HOTELS_API_URL',
  bookings: 'NEXT_PUBLIC_BOOKINGS_API_URL',
  payments: 'NEXT_PUBLIC_PAYMENTS_API_URL',
}

function getBaseUrl(service: ApiService) {
  const environmentKey = serviceEnvironmentKeys[service]
  const value = process.env[environmentKey]?.trim()

  if (!value) {
    throw new Error(`Missing environment variable ${environmentKey}`)
  }

  return value.replace(/\/+$/, '')
}

function getAccessToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('access_token')
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | undefined
  let details: unknown

  try {
    details = await response.json()
    if (details && typeof details === 'object') body = details as ApiErrorBody
  } catch {
    // Responses without JSON bodies still produce a useful status based error.
  }

  return new ApiError(
    body?.message || body?.error || response.statusText || 'API request failed',
    response.status,
    body?.code,
    details,
  )
}

export function createHttpClient(service: ApiService) {
  const baseUrl = getBaseUrl(service)

  return {
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
      const { body, token, headers, ...init } = options
      const requestHeaders = new Headers(headers)
      if (!requestHeaders.has('Accept')) requestHeaders.set('Accept', 'application/json')

      if (body !== undefined && !(body instanceof FormData)) {
        requestHeaders.set('Content-Type', 'application/json')
      }

      const accessToken = token === undefined ? getAccessToken() : token
      if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`)

      let response: Response
      try {
        response = await fetch(`${baseUrl}/${path.replace(/^\/+/, '')}`, {
          ...init,
          headers: requestHeaders,
          body: body === undefined
            ? undefined
            : body instanceof FormData
              ? body
              : JSON.stringify(body),
        })
      } catch (error) {
        throw new ApiError(
          error instanceof Error ? error.message : 'Network request failed',
          0,
          'NETWORK_ERROR',
          error,
        )
      }

      if (!response.ok) throw await parseError(response)
      if (response.status === 204) return undefined as T
      return await response.json() as T
    },
  }
}
