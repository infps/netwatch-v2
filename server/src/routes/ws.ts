import { Hono } from 'hono'
import { createBunWebSocket } from 'hono/bun'
import type { WSContext } from 'hono/ws'
import { verifyJwt } from '../lib/jwt'
import {
  addConnection,
  removeConnection,
  getOnlineUsers,
  broadcastToUser,
  createSession,
  getSession,
  activateSession,
  endSession
} from '../lib/ws-manager'
import { db } from '../db/client'
import { activity } from '../db/schema'
import type { WsClientMsg, WsServerMsg, ActivityEvent } from '../types'

const { upgradeWebSocket, websocket } = createBunWebSocket()

const wsState = new WeakMap<WSContext<unknown>, { userId?: string; email?: string; authenticated: boolean }>()

function send(ws: WSContext<unknown>, msg: WsServerMsg) {
  ws.send(JSON.stringify(msg))
}

async function storeActivity(userId: string, event: ActivityEvent) {
  try {
    await db.insert(activity).values({
      id: event.eventId,
      userId,
      eventType: event.type,
      data: JSON.stringify(event),
      timestamp: event.timestamp
    }).onConflictDoNothing()
  } catch {
    // Ignore errors
  }
}

const app = new Hono()

app.get(
  '/',
  upgradeWebSocket(() => ({
    onOpen(_event, ws) {
      wsState.set(ws, { authenticated: false })
    },

    async onMessage(event, ws) {
      try {
        const msg: WsClientMsg = JSON.parse(event.data.toString())
        const state = wsState.get(ws) ?? { authenticated: false }

        if (msg.type === 'auth') {
          const payload = await verifyJwt(msg.token)
          if (!payload) {
            send(ws, { type: 'auth_fail', reason: 'Invalid token' })
            return
          }

          state.userId = payload.userId
          state.email = payload.email
          state.authenticated = true
          wsState.set(ws, state)
          addConnection(payload.userId, payload.email, ws)
          send(ws, { type: 'auth_ok' })
          return
        }

        if (!state.authenticated || !state.userId || !state.email) {
          send(ws, { type: 'error', message: 'Not authenticated' })
          return
        }

        const userId = state.userId
        const userEmail = state.email

        // Activity batch
        if (msg.type === 'activity_batch') {
          for (const ev of msg.events) {
            await storeActivity(userId, ev)
          }
          send(ws, { type: 'batch_ack', batchId: msg.batchId })
          return
        }

        // Get online users
        if (msg.type === 'get_online_users') {
          send(ws, { type: 'online_users', users: getOnlineUsers(userId) })
          return
        }

        // RTC: Request control of another user
        if (msg.type === 'rtc_request') {
          const session = createSession(userId, msg.targetUserId)
          if (!session) {
            send(ws, { type: 'rtc_rejected', sessionId: '', reason: 'User unavailable or already in session' })
            return
          }
          // Notify host of incoming request
          broadcastToUser(msg.targetUserId, {
            type: 'rtc_incoming',
            sessionId: session.id,
            viewerUserId: userId,
            viewerEmail: userEmail
          })
          return
        }

        // RTC: Host accepts request
        if (msg.type === 'rtc_accept') {
          const session = getSession(msg.sessionId)
          if (!session || session.hostUserId !== userId) {
            send(ws, { type: 'error', message: 'Invalid session' })
            return
          }
          if (!activateSession(msg.sessionId)) {
            send(ws, { type: 'error', message: 'Failed to activate session' })
            return
          }
          // Notify viewer that request was accepted
          broadcastToUser(session.viewerUserId, {
            type: 'rtc_accepted',
            sessionId: msg.sessionId,
            hostUserId: userId
          })
          return
        }

        // RTC: Host rejects request
        if (msg.type === 'rtc_reject') {
          const session = getSession(msg.sessionId)
          if (!session || session.hostUserId !== userId) {
            send(ws, { type: 'error', message: 'Invalid session' })
            return
          }
          broadcastToUser(session.viewerUserId, {
            type: 'rtc_rejected',
            sessionId: msg.sessionId,
            reason: 'Host rejected request'
          })
          endSession(msg.sessionId, 'rejected')
          return
        }

        // RTC: Relay offer (viewer -> host)
        if (msg.type === 'rtc_offer') {
          const session = getSession(msg.sessionId)
          if (!session || session.viewerUserId !== userId) {
            send(ws, { type: 'error', message: 'Invalid session' })
            return
          }
          broadcastToUser(msg.targetUserId, {
            type: 'rtc_offer',
            sessionId: msg.sessionId,
            offer: msg.offer
          })
          return
        }

        // RTC: Relay answer (host -> viewer)
        if (msg.type === 'rtc_answer') {
          const session = getSession(msg.sessionId)
          if (!session || session.hostUserId !== userId) {
            send(ws, { type: 'error', message: 'Invalid session' })
            return
          }
          broadcastToUser(msg.targetUserId, {
            type: 'rtc_answer',
            sessionId: msg.sessionId,
            answer: msg.answer
          })
          return
        }

        // RTC: Relay ICE candidate
        if (msg.type === 'rtc_ice') {
          const session = getSession(msg.sessionId)
          if (!session) {
            send(ws, { type: 'error', message: 'Invalid session' })
            return
          }
          // Verify sender is part of session
          if (session.viewerUserId !== userId && session.hostUserId !== userId) {
            send(ws, { type: 'error', message: 'Not part of session' })
            return
          }
          broadcastToUser(msg.targetUserId, {
            type: 'rtc_ice',
            sessionId: msg.sessionId,
            candidate: msg.candidate
          })
          return
        }

        // RTC: Disconnect session
        if (msg.type === 'rtc_disconnect') {
          const session = getSession(msg.sessionId)
          if (!session) return
          if (session.viewerUserId !== userId && session.hostUserId !== userId) return
          endSession(msg.sessionId, 'user_disconnected')
          return
        }

        // RTC: Relay input from viewer to host
        if (msg.type === 'rtc_input') {
          const session = getSession(msg.sessionId)
          if (!session || session.viewerUserId !== userId) {
            return // Silently ignore invalid input
          }
          broadcastToUser(session.hostUserId, {
            type: 'rtc_input',
            sessionId: msg.sessionId,
            input: msg.input
          })
          return
        }

      } catch {
        send(ws, { type: 'error', message: 'Invalid message format' })
      }
    },

    onClose(_event, ws) {
      const state = wsState.get(ws)
      if (state?.userId) {
        removeConnection(state.userId)
      }
      wsState.delete(ws)
    }
  }))
)

export { app as wsApp, websocket }
