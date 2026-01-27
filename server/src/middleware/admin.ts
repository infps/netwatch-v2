import { Context, Next } from 'hono'

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
}
