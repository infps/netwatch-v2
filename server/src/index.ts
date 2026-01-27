import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import punch from './routes/punch'
import { wsApp, websocket } from './routes/ws'

const app = new Hono()

app.use('/*', cors())

app.route('/auth', auth)
app.route('/punch', punch)
app.route('/ws', wsApp)

app.get('/health', (c) => c.json({ status: 'ok' }))

const server = Bun.serve({
  port: 3000,
  fetch: app.fetch,
  websocket
})

console.log(`Server running on http://localhost:${server.port}`)
