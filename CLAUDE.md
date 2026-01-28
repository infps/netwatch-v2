# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NetWatch - employee monitoring & remote control application with 3 components:
- **admin/** - React+Vite dashboard (port 5173)
- **server/** - Bun+Hono backend (port 3000)
- **agent/** - Electron desktop app for monitoring/remote control

## Commands

### Server (Bun)
```bash
cd server
bun run dev          # dev server
bun run db:generate  # drizzle migrations
bun run db:migrate   # run migrations
bun run db:push      # push schema
bun run db:studio    # drizzle studio
bun run seed         # seed db
```

### Admin (npm)
```bash
cd admin
npm run dev      # vite dev
npm run build    # production build
```

### Agent (npm)
```bash
cd agent
npm start        # electron dev
npm run make     # build installers
npm run lint     # eslint
```

## Architecture

### Real-time Communication Flow
1. Agent connects via WebSocket to server (`/ws`)
2. `ws-manager.ts` tracks connections, sessions, online users
3. Activity events batched & sent every 60s with batch IDs
4. RTC signaling (offer/answer/ICE) over WebSocket for P2P screen sharing

### Key Server Files
- `src/lib/ws-manager.ts` - WebSocket connection & session mgmt
- `src/db/schema.ts` - Drizzle ORM schema (users, punches, activity)
- `src/middleware/jwt.ts` - JWT auth middleware
- `src/routes/ws.ts` - WebSocket handlers & RTC signaling

### Key Agent Files
- `src/index.ts` - main electron process, IPC handlers
- `src/lib/screen-capture.ts` - display enumeration & capture
- `src/lib/input-injector.ts` - remote mouse/keyboard injection
- `src/lib/rtc-state.ts` - WebRTC session state

### Database
PostgreSQL (Neon serverless) with Drizzle ORM. Tables: `users`, `punches`, `activity`. Server needs `DATABASE_URL` env var.

### Auth
JWT-based, role field distinguishes 'user' vs 'admin'

## macOS Permissions (Agent)

Screen capture requires **Screen Recording** permission in System Settings → Privacy & Security.

- Dev app (`npm start`): Grant to `agent/node_modules/electron/dist/Electron.app`
- Built app: Grant to `my-new-app` (or app bundle name)
- App must be restarted after granting permission
- `systemPreferences.getMediaAccessStatus('screen')` can be unreliable - prefer trying capture and handling errors
