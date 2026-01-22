import { Context, Next } from 'hono'
import { verifyJwt } from '../lib/jwt'
import type { JwtPayload } from '../types'

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

export async function jwtMiddleware(c: Context, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing token' }, 401)
  }

  const token = auth.slice(7)
  const payload = await verifyJwt(token)

  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  c.set('user', payload)
  await next()
}
