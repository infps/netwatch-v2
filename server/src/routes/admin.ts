import { Hono } from "hono";
import { eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { jwtMiddleware } from "../middleware/jwt";
import { adminMiddleware } from "../middleware/admin";
import { getOnlineUsers } from "../lib/ws-manager";
import type { UserRole } from "../types";

const admin = new Hono();

admin.use("/*", jwtMiddleware, adminMiddleware);

admin.get("/users", async (c) => {
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(isNull(users.deletedAt));

  return c.json(allUsers);
});

admin.post("/users", async (c) => {
  const body = await c.req.json<{
    email: string;
    password: string;
    role?: UserRole;
  }>();
  const { email, password, role = "user" } = body;

  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    return c.json({ error: "Email already exists" }, 400);
  }

  const id = crypto.randomUUID();
  const passwordHash = await Bun.password.hash(password);

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    role,
    createdAt: Date.now(),
  });

  return c.json({ id, email, role, createdAt: Date.now() }, 201);
});

// Update user
admin.put("/users/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{
    email?: string;
    password?: string;
    role?: UserRole;
  }>();

  const [existing] = await db.select().from(users).where(eq(users.id, id));
  if (!existing || existing.deletedAt) {
    return c.json({ error: "User not found" }, 404);
  }

  const updates: Record<string, unknown> = {};
  if (body.email) updates.email = body.email;
  if (body.password)
    updates.passwordHash = await Bun.password.hash(body.password);
  if (body.role) updates.role = body.role;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No updates provided" }, 400);
  }

  await db.update(users).set(updates).where(eq(users.id, id));

  return c.json({ success: true });
});

// Soft delete user
admin.delete("/users/:id", async (c) => {
  const { id } = c.req.param();

  const [existing] = await db.select().from(users).where(eq(users.id, id));
  if (!existing || existing.deletedAt) {
    return c.json({ error: "User not found" }, 404);
  }

  await db.update(users).set({ deletedAt: Date.now() }).where(eq(users.id, id));

  return c.json({ success: true });
});

// Get online users
admin.get("/online", (c) => {
  const online = getOnlineUsers();
  return c.json(online);
});

export default admin;
