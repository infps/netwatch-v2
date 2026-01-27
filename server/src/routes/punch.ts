import { Hono } from 'hono'
import { db } from '../db/client'
import { punches } from '../db/schema'
import { jwtMiddleware } from '../middleware/jwt'
import type { PunchType, PunchRecord } from '../types'

const punch = new Hono()

punch.use('/*', jwtMiddleware)

async function recordPunch(userId: string, type: PunchType): Promise<PunchRecord> {
  const record: PunchRecord = {
    id: crypto.randomUUID(),
    userId,
    type,
    timestamp: Date.now()
  }

  await db.insert(punches).values({
    id: record.id,
    userId: record.userId,
    type: record.type,
    timestamp: record.timestamp
  })

  return record
}

punch.post('/in', async (c) => {
  const user = c.get('user')
  const record = await recordPunch(user.userId, 'in')
  return c.json(record)
})

punch.post('/out', async (c) => {
  const user = c.get('user')
  const record = await recordPunch(user.userId, 'out')
  return c.json(record)
})

punch.post('/break/start', async (c) => {
  const user = c.get('user')
  const record = await recordPunch(user.userId, 'break_start')
  return c.json(record)
})

punch.post('/break/end', async (c) => {
  const user = c.get('user')
  const record = await recordPunch(user.userId, 'break_end')
  return c.json(record)
})

export default punch
