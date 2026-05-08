import type { ServerResponse } from 'http'

export interface WSClient {
  id: string
  res: ServerResponse
  write(data: string): boolean
}

// Global task manager: tracks active adapter tasks per client_id
export interface ActiveTask {
  adapterId: string
  cancelToken: CancelToken
}

export interface CancelToken {
  cancelled: boolean
}

// SSE Connection Manager
export class SSEManager {
  private clients: Map<string, WSClient> = new Map()

  has(clientId: string): boolean {
    return this.clients.has(clientId)
  }

  subscribe(clientId: string, res: ServerResponse): WSClient {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write(`data: ${JSON.stringify({ type: 'connected', client_id: clientId })}\n\n`)

    const client: WSClient = {
      id: clientId,
      res,
      write: (data: string) => {
        try {
          return res.write(`data: ${data}\n\n`)
        } catch {
          return false
        }
      },
    }

    this.clients.set(clientId, client)
    return client
  }

  disconnect(clientId: string) {
    const client = this.clients.get(clientId)
    if (client) {
      try {
        client.write(JSON.stringify({ type: 'disconnected', client_id: clientId }))
      } catch { /* ignore */ }
      this.clients.delete(clientId)
    }
  }

  async sendMessage(clientId: string, message: Record<string, any>) {
    const client = this.clients.get(clientId)
    if (!client) {
      console.warn(`[SSE] No connection for client ${clientId}`)
      return false
    }
    try {
      const success = client.write(JSON.stringify(message))
      if (message.type === 'result') {
        console.log(`✅ [SSE] Successfully pushed result to ${clientId}`)
      }
      return success
    } catch (error) {
      console.warn(`[SSE] Failed to send to ${clientId}:`, String(error).slice(0, 100))
      this.clients.delete(clientId)
      return false
    }
  }

  getClient(clientId: string): WSClient | undefined {
    return this.clients.get(clientId)
  }

  getAllClientIds(): string[] {
    return Array.from(this.clients.keys())
  }
}

// Global task registry
const activeTasks = new Map<string, ActiveTask>()

export function registerTask(clientId: string, adapterId: string, cancelToken: CancelToken): void {
  activeTasks.set(clientId, { adapterId, cancelToken })
  console.log(`🔗 [Task] Registered task for ${clientId} (adapter: ${adapterId})`)
}

export function getTask(clientId: string): ActiveTask | undefined {
  return activeTasks.get(clientId)
}

export function unregisterTask(clientId: string): void {
  activeTasks.delete(clientId)
  console.log(`🛑 [Task] Unregistered task for ${clientId}`)
}

export function isTaskCancelled(clientId: string): boolean {
  const task = activeTasks.get(clientId)
  return task?.cancelToken.cancelled ?? false
}

// Singleton
export const sseManager = new SSEManager()
