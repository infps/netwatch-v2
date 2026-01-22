import type { ServerWebSocket } from 'bun'
import type { JwtPayload } from '../types'

export type WsData = {
  userId?: string
  authenticated: boolean
}

const connections = new Map<string, ServerWebSocket<WsData>>()

export function addConnection(userId: string, ws: ServerWebSocket<WsData>) {
  connections.set(userId, ws)
}

export function removeConnection(userId: string) {
  connections.delete(userId)
}

export function getConnection(userId: string) {
  return connections.get(userId)
}

export function broadcastToUser(userId: string, message: object) {
  const ws = connections.get(userId)
  if (ws) {
    ws.send(JSON.stringify(message))
  }
}
