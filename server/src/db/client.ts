import { Database } from 'bun:sqlite'
import { initSchema } from './schema'

const db = new Database('netwatch.db')
initSchema(db)

// Seed a test user if none exists
const existingUser = db.query('SELECT id FROM users LIMIT 1').get()
if (!existingUser) {
  const hashedPw = await Bun.password.hash('password123', { algorithm: 'bcrypt' })
  db.run(
    'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    [crypto.randomUUID(), 'test@example.com', hashedPw, Date.now()]
  )
}

export { db }
