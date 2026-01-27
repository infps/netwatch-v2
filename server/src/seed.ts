import { db } from './db/client'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'

const ADMIN_EMAIL = 'admin@netwatch.local'
const ADMIN_PASSWORD = 'admin123'

async function seed() {
  console.log('Seeding database...')

  const existing = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL))

  if (existing.length > 0) {
    console.log('Admin user already exists')
    return
  }

  const id = crypto.randomUUID()
  const passwordHash = await Bun.password.hash(ADMIN_PASSWORD)

  await db.insert(users).values({
    id,
    email: ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
    createdAt: Date.now()
  })

  console.log(`Created admin user: ${ADMIN_EMAIL}`)
  console.log(`Password: ${ADMIN_PASSWORD}`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
