import { Hono } from 'hono'
import { db } from '../db/client'
import { signJwt } from '../lib/jwt'
import type { LoginReq, LoginRes } from '../types'

const auth = new Hono()

auth.post('/login', async (c) => {
  const body = await c.req.json<LoginReq>()
  const { email, password } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400)
  }

  const user = db.query<{ id: string; email: string; password_hash: string }, [string]>(
    'SELECT id, email, password_hash FROM users WHERE email = ?'
  ).get(email)

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const valid = await Bun.password.verify(password, user.password_hash)
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const token = await signJwt({ userId: user.id, email: user.email })

  const res: LoginRes = {
    token,
    user: { id: user.id, email: user.email }
  }

  return c.json(res)
})

export default auth
