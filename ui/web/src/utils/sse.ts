/**
 * SSE (Server-Sent Events) client utility for MangaForge Studio.
 *
 * Connects to the backend SSE endpoint for real-time task progress
 * and provides an interrupt capability.
 */

const DEFAULT_API_BASE = 'http://localhost:8787/api'

function getConfiguredApiBaseURL() {
  return String(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, '')
}

export function buildSSEUrl(clientId: string, apiBaseURL = getConfiguredApiBaseURL()) {
  const base = String(apiBaseURL || DEFAULT_API_BASE).replace(/\/+$/, '')
  return `${base}/sse/${encodeURIComponent(clientId)}`
}

function buildInterruptUrl(clientId: string) {
  return `${getConfiguredApiBaseURL()}/interrupt/${encodeURIComponent(clientId)}`
}

export interface SSEMessage {
  type: string
  progress?: string
  percent?: number
  step?: string
  stepStatus?: string
  message?: string
  error?: string
  result?: any
  [key: string]: any
}

export interface SSEClient {
  clientId: string
  connect(): Promise<void>
  disconnect(): void
  interrupt(): Promise<boolean>
  onMessage: (msg: SSEMessage) => void
}

export function createSSEClient(clientId: string, onMessage: (msg: SSEMessage) => void): SSEClient {
  let eventSource: EventSource | null = null

  return {
    clientId,
    onMessage,
    async connect() {
      return new Promise<void>((resolve, reject) => {
        try {
          eventSource = new EventSource(buildSSEUrl(clientId))

          eventSource.onopen = () => {
            // Connection established
          }

          eventSource.onmessage = (event) => {
            try {
              const msg: SSEMessage = JSON.parse(event.data)
              onMessage(msg)

              // Auto-resolve on 'connected'
              if (msg.type === 'connected') {
                resolve()
              }

              // Auto-close on terminal events
              if (msg.type === 'done' || msg.type === 'error' || msg.type === 'interrupted') {
                setTimeout(() => {
                  this.disconnect()
                }, 500)
              }
            } catch {
              // Skip non-JSON events
            }
          }

          eventSource.onerror = (err) => {
            eventSource?.close()
            eventSource = null
            reject(err)
          }
        } catch (err) {
          reject(err)
        }
      })
    },

    disconnect() {
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
    },

    async interrupt(): Promise<boolean> {
      try {
        const resp = await fetch(buildInterruptUrl(clientId), { method: 'POST' })
        if (resp.ok) {
          const data = await resp.json()
          return data.success ?? true
        }
        return false
      } catch {
        return false
      }
    },
  }
}

/**
 * Generate a unique client ID for SSE sessions.
 */
export function generateClientId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
