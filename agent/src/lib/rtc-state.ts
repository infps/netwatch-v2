// RTC session state manager for main process
export type RtcRole = 'host' | 'viewer' | null
export type RtcSessionState = {
  sessionId: string | null
  role: RtcRole
  remoteUserId: string | null
  remoteEmail: string | null
}

let state: RtcSessionState = {
  sessionId: null,
  role: null,
  remoteUserId: null,
  remoteEmail: null
}

export function getSessionState(): RtcSessionState {
  return { ...state }
}

export function setHostingSession(sessionId: string, viewerUserId: string, viewerEmail: string) {
  state = { sessionId, role: 'host', remoteUserId: viewerUserId, remoteEmail: viewerEmail }
}

export function setViewingSession(sessionId: string, hostUserId: string) {
  state = { sessionId, role: 'viewer', remoteUserId: hostUserId, remoteEmail: null }
}

export function clearSession() {
  state = { sessionId: null, role: null, remoteUserId: null, remoteEmail: null }
}

export function isInSession(): boolean {
  return state.sessionId !== null
}

export function isHost(): boolean {
  return state.role === 'host'
}

export function isViewer(): boolean {
  return state.role === 'viewer'
}
