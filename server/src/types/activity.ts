export type MouseEvent = {
  type: 'mouse'
  x: number
  y: number
  movements: number
  timestamp: number
  eventId: string
}

export type KeyEvent = {
  type: 'key'
  keystrokes: number
  recentKeys: number[]
  timestamp: number
  eventId: string
}

export type ActivityEvent = MouseEvent | KeyEvent

// Remote input event (mouse/keyboard from viewer to host)
export type RemoteInputEvent =
  | { inputType: 'mouse_move'; x: number; y: number }
  | { inputType: 'mouse_click'; x: number; y: number; button: 'left' | 'right' | 'middle' }
  | { inputType: 'mouse_down'; x: number; y: number; button: 'left' | 'right' | 'middle' }
  | { inputType: 'mouse_up'; x: number; y: number; button: 'left' | 'right' | 'middle' }
  | { inputType: 'mouse_scroll'; x: number; y: number; deltaX: number; deltaY: number }
  | { inputType: 'key_down'; key: string; code: string; modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } }
  | { inputType: 'key_up'; key: string; code: string; modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } }

export type OnlineUser = {
  userId: string
  email: string
  status: 'available' | 'hosting' | 'viewing'
}

export type WsClientMsg =
  | { type: 'auth'; token: string }
  | { type: 'activity_batch'; events: ActivityEvent[]; batchId: string }
  // RTC signaling
  | { type: 'get_online_users' }
  | { type: 'rtc_request'; targetUserId: string }
  | { type: 'rtc_accept'; sessionId: string; viewerUserId: string }
  | { type: 'rtc_reject'; sessionId: string; viewerUserId: string }
  | { type: 'rtc_offer'; sessionId: string; targetUserId: string; offer: RTCSessionDescriptionInit }
  | { type: 'rtc_answer'; sessionId: string; targetUserId: string; answer: RTCSessionDescriptionInit }
  | { type: 'rtc_ice'; sessionId: string; targetUserId: string; candidate: RTCIceCandidateInit }
  | { type: 'rtc_disconnect'; sessionId: string }
  | { type: 'rtc_input'; sessionId: string; input: RemoteInputEvent }

export type WsServerMsg =
  | { type: 'auth_ok' }
  | { type: 'auth_fail'; reason: string }
  | { type: 'batch_ack'; batchId: string }
  | { type: 'error'; message: string }
  // RTC signaling
  | { type: 'online_users'; users: OnlineUser[] }
  | { type: 'rtc_incoming'; sessionId: string; viewerUserId: string; viewerEmail: string }
  | { type: 'rtc_accepted'; sessionId: string; hostUserId: string }
  | { type: 'rtc_rejected'; sessionId: string; reason?: string }
  | { type: 'rtc_offer'; sessionId: string; offer: RTCSessionDescriptionInit }
  | { type: 'rtc_answer'; sessionId: string; answer: RTCSessionDescriptionInit }
  | { type: 'rtc_ice'; sessionId: string; candidate: RTCIceCandidateInit }
  | { type: 'rtc_disconnected'; sessionId: string; reason?: string }
  | { type: 'rtc_input'; sessionId: string; input: RemoteInputEvent }
