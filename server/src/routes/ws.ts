import type { ServerWebSocket } from 'bun'
import { verifyJwt } from '../lib/jwt'
import { addConnection, removeConnection, type WsData } from '../lib/ws-manager'
import { db } from '../db/client'
import type { WsClientMsg, WsServerMsg, ActivityEvent } from '../types'

function send(ws: ServerWebSocket<WsData>, msg: WsServerMsg) {
  ws.send(JSON.stringify(msg))
}

function storeActivity(userId: string, event: ActivityEvent) {
  try {
    db.run(
      'INSERT OR IGNORE INTO activity (id, user_id, event_type, data, timestamp) VALUES (?, ?, ?, ?, ?)',
      [event.eventId, userId, event.type, JSON.stringify(event), event.timestamp]
    )
  } catch {
    // Duplicate eventId, ignore
  }
}

export const wsHandler = {
  open(ws: ServerWebSocket<WsData>) {
    ws.data = { authenticated: false }
  },

  async message(ws: ServerWebSocket<WsData>, message: string | Buffer) {
    try {
      const msg: WsClientMsg = JSON.parse(message.toString())

      if (msg.type === 'auth') {
        const payload = await verifyJwt(msg.token)
        if (!payload) {
          send(ws, { type: 'auth_fail', reason: 'Invalid token' })
          return
        }

        ws.data.userId = payload.userId
        ws.data.authenticated = true
        addConnection(payload.userId, ws)
        send(ws, { type: 'auth_ok' })
        return
      }

      if (!ws.data.authenticated || !ws.data.userId) {
        send(ws, { type: 'error', message: 'Not authenticated' })
        return
      }

      if (msg.type === 'activity_batch') {
        for (const event of msg.events) {
          storeActivity(ws.data.userId, event)
        }
        send(ws, { type: 'batch_ack', batchId: msg.batchId })
      }
    } catch {
      send(ws, { type: 'error', message: 'Invalid message format' })
    }
  },

  close(ws: ServerWebSocket<WsData>) {
    if (ws.data.userId) {
      removeConnection(ws.data.userId)
    }
  }
}
