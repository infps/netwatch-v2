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

export type WsClientMsg =
  | { type: 'auth'; token: string }
  | { type: 'activity_batch'; events: ActivityEvent[]; batchId: string }

export type WsServerMsg =
  | { type: 'auth_ok' }
  | { type: 'auth_fail'; reason: string }
  | { type: 'batch_ack'; batchId: string }
  | { type: 'error'; message: string }
