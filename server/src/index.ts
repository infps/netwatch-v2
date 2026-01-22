import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import punch from './routes/punch'
import { wsHandler } from './routes/ws'
import type { WsData } from './lib/ws-manager'

const app = new Hono()

app.use('/*', cors())

app.route('/auth', auth)
app.route('/punch', punch)

app.get('/health', (c) => c.json({ status: 'ok' }))

const server = Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    const url = new URL(req.url)

    if (url.pathname === '/ws') {
      const upgraded = server.upgrade<WsData>(req, { data: { authenticated: false } })
      if (upgraded) return undefined
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    return app.fetch(req)
  },
  websocket: wsHandler
})

console.log(`Server running on http://localhost:${server.port}`)
