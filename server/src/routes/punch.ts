import { Hono } from 'hono'
import { db } from '../db/client'
import { jwtMiddleware } from '../middleware/jwt'
import type { PunchType, PunchRecord } from '../types'

const punch = new Hono()

punch.use('/*', jwtMiddleware)

function recordPunch(userId: string, type: PunchType): PunchRecord {
  const record: PunchRecord = {
    id: crypto.randomUUID(),
    userId,
    type,
    timestamp: Date.now()
  }

  db.run(
    'INSERT INTO punches (id, user_id, type, timestamp) VALUES (?, ?, ?, ?)',
    [record.id, record.userId, record.type, record.timestamp]
  )

  return record
}

punch.post('/in', (c) => {
  const user = c.get('user')
  const record = recordPunch(user.userId, 'in')
  return c.json(record)
})

punch.post('/out', (c) => {
  const user = c.get('user')
  const record = recordPunch(user.userId, 'out')
  return c.json(record)
})

punch.post('/break/start', (c) => {
  const user = c.get('user')
  const record = recordPunch(user.userId, 'break_start')
  return c.json(record)
})

punch.post('/break/end', (c) => {
  const user = c.get('user')
  const record = recordPunch(user.userId, 'break_end')
  return c.json(record)
})

export default punch
