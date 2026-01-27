import type { WSContext } from 'hono/ws'
import type { OnlineUser } from '../types'

type ConnectionInfo = {
  ws: WSContext<unknown>
  email: string
  status: 'available' | 'hosting' | 'viewing'
}

type RtcSession = {
  id: string
  hostUserId: string
  viewerUserId: string
  status: 'pending' | 'active'
  createdAt: number
}

const connections = new Map<string, ConnectionInfo>()
const sessions = new Map<string, RtcSession>()
const pendingTimeouts = new Map<string, NodeJS.Timeout>()

const PENDING_TIMEOUT_MS = 30000 // 30s auto-reject

export function addConnection(userId: string, email: string, ws: WSContext<unknown>) {
  connections.set(userId, { ws, email, status: 'available' })
  broadcastOnlineUsers()
}

export function removeConnection(userId: string) {
  const conn = connections.get(userId)
  if (conn) {
    // Clean up any sessions this user was part of
    for (const [sessionId, session] of sessions) {
      if (session.hostUserId === userId || session.viewerUserId === userId) {
        endSession(sessionId, 'user_disconnected')
      }
    }
  }
  connections.delete(userId)
  broadcastOnlineUsers()
}

export function getConnection(userId: string) {
  return connections.get(userId)?.ws
}

export function getOnlineUsers(excludeUserId?: string): OnlineUser[] {
  const users: OnlineUser[] = []
  for (const [userId, info] of connections) {
    if (userId !== excludeUserId) {
      users.push({ userId, email: info.email, status: info.status })
    }
  }
  return users
}

export function broadcastToUser(userId: string, message: object) {
  const conn = connections.get(userId)
  if (conn) {
    conn.ws.send(JSON.stringify(message))
  }
}

function broadcastOnlineUsers() {
  for (const [userId] of connections) {
    const users = getOnlineUsers(userId)
    broadcastToUser(userId, { type: 'online_users', users })
  }
}

// Session management
export function createSession(viewerUserId: string, hostUserId: string): RtcSession | null {
  // Check if either user already in a session
  const viewerConn = connections.get(viewerUserId)
  const hostConn = connections.get(hostUserId)

  if (!viewerConn || !hostConn) return null
  if (viewerConn.status !== 'available' || hostConn.status !== 'available') return null

  const sessionId = crypto.randomUUID()
  const session: RtcSession = {
    id: sessionId,
    hostUserId,
    viewerUserId,
    status: 'pending',
    createdAt: Date.now()
  }

  sessions.set(sessionId, session)

  // Auto-reject after timeout
  const timeout = setTimeout(() => {
    const s = sessions.get(sessionId)
    if (s && s.status === 'pending') {
      endSession(sessionId, 'timeout')
    }
  }, PENDING_TIMEOUT_MS)
  pendingTimeouts.set(sessionId, timeout)

  return session
}

export function getSession(sessionId: string): RtcSession | undefined {
  return sessions.get(sessionId)
}

export function getSessionByUsers(viewerUserId: string, hostUserId: string): RtcSession | undefined {
  for (const session of sessions.values()) {
    if (session.viewerUserId === viewerUserId && session.hostUserId === hostUserId) {
      return session
    }
  }
  return undefined
}

export function activateSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session || session.status !== 'pending') return false

  // Clear pending timeout
  const timeout = pendingTimeouts.get(sessionId)
  if (timeout) {
    clearTimeout(timeout)
    pendingTimeouts.delete(sessionId)
  }

  session.status = 'active'

  // Update user statuses
  const viewerConn = connections.get(session.viewerUserId)
  const hostConn = connections.get(session.hostUserId)
  if (viewerConn) viewerConn.status = 'viewing'
  if (hostConn) hostConn.status = 'hosting'

  broadcastOnlineUsers()
  return true
}

export function endSession(sessionId: string, reason?: string) {
  const session = sessions.get(sessionId)
  if (!session) return

  // Clear pending timeout
  const timeout = pendingTimeouts.get(sessionId)
  if (timeout) {
    clearTimeout(timeout)
    pendingTimeouts.delete(sessionId)
  }

  // Reset user statuses
  const viewerConn = connections.get(session.viewerUserId)
  const hostConn = connections.get(session.hostUserId)
  if (viewerConn) viewerConn.status = 'available'
  if (hostConn) hostConn.status = 'available'

  // Notify both users
  broadcastToUser(session.viewerUserId, { type: 'rtc_disconnected', sessionId, reason })
  broadcastToUser(session.hostUserId, { type: 'rtc_disconnected', sessionId, reason })

  sessions.delete(sessionId)
  broadcastOnlineUsers()
}

export function getUserSession(userId: string): RtcSession | undefined {
  for (const session of sessions.values()) {
    if (session.viewerUserId === userId || session.hostUserId === userId) {
      return session
    }
  }
  return undefined
}
