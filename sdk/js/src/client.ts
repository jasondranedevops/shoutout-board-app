import { ShoutboardClientOptions } from './types'

export class ShoutboardError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ShoutboardError'
  }
}

export class HttpClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(options: ShoutboardClientOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl ?? 'https://api.shoutboard.io').replace(/\/$/, '')
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const json = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = json?.error?.message ?? json?.message ?? `Request failed with status ${response.status}`
      const code = json?.error?.code ?? 'UNKNOWN_ERROR'
      throw new ShoutboardError(response.status, code, message)
    }

    return (json.data ?? json) as T
  }

  get<T>(path: string, query?: Record<string, string | number | undefined>) {
    return this.request<T>('GET', path, undefined, query)
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body)
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body)
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path)
  }
}
