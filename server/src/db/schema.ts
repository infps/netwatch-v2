import { pgTable, text, bigint, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  deletedAt: bigint('deleted_at', { mode: 'number' })
})

export const punches = pgTable('punches', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull()
}, (t) => [
  index('idx_punches_user').on(t.userId)
])

export const activity = pgTable('activity', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  eventType: text('event_type').notNull(),
  data: text('data').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull()
}, (t) => [
  index('idx_activity_user').on(t.userId),
  index('idx_activity_id').on(t.id)
])
