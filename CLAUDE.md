# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Two-package monorepo (no workspaces tool — each package has its own `package.json` and `node_modules`):

- `backend/` — NestJS 11 API + BullMQ workers, Prisma 7 against Postgres 16
- `frontend/` — Next.js 16 (App Router) + React 19 + Tailwind 4 dashboard
- `docker-compose.yml` — full-stack infra (postgres, redis, backend, frontend)

The two packages communicate over HTTP only; the frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) and prepends `/api` to every call (see `frontend/src/lib/api.ts`).

## Commands

### Backend (`cd backend`)
- `npm run start:dev` — Nest in watch mode (listens on `:3001`, Swagger at `/api/docs`)
- `npm run build` / `npm run start:prod` — compile to `dist/`, run `node dist/main`
- `npm run lint` — ESLint with `--fix`
- `npm test` — Jest unit tests (config inline in `package.json`, matches `*.spec.ts` under `src/`)
- `npm run test:e2e` — Jest with `test/jest-e2e.json`
- Single test: `npx jest path/to/file.spec.ts` or `npx jest -t "test name pattern"`
- Prisma: `npx prisma migrate dev --name <migration>`, `npx prisma generate`, `npx prisma studio`

### Frontend (`cd frontend`)
- `npm run dev` — Next dev server on `:3000`
- `npm run build` / `npm start` — production build + serve
- `npm run lint` — ESLint (flat config, `eslint-config-next`)

### Full-stack
- `docker-compose up postgres redis -d` — just the infra (typical local dev mode)
- `docker-compose up --build` — everything in containers

## Architecture

### Backend module wiring (`backend/src/app.module.ts`)
The Nest application is composed of feature modules, plus three infra modules registered globally:
- `ConfigModule` (env), `BullModule` (Redis connection for BullMQ), `ScheduleModule` (cron).
- `PrismaModule` exposes a single `PrismaService` injected everywhere.

Feature modules: `AuthModule`, `UsersModule`, `MonitorsModule`, `ChecksModule`, `IncidentsModule`, `WorkerModule`, `SchedulerModule`, `AlertsModule`. All HTTP routes are prefixed with `/api` (set in `main.ts`); CORS allows `FRONTEND_URL` (default `http://localhost:3000`); a global `ValidationPipe` enforces DTO validation with `whitelist + forbidNonWhitelisted + transform`.

### The check pipeline (the core of this system)
This is the part that requires reading multiple files to understand. The flow is:

1. **Trigger** — checks land on the `monitor-checks` BullMQ queue from two sources:
   - `SchedulerService` (`scheduler/scheduler.service.ts`) runs every minute via `@Cron(EVERY_MINUTE)`. It scans active monitors, computes whether each is "due" based on `lastCheckedAt` + `interval` (minutes), and enqueues a job with a deterministic `jobId` of the form `check-<monitorId>-<intervalWindow>` to deduplicate within a window.
   - `MonitorsService.create` and `.resume` enqueue an immediate job (`immediate-<id>` / `resume-<id>`) so a new/resumed monitor checks right away rather than waiting for the next cron tick.

2. **Process** — `CheckProcessor` (`worker/check.processor.ts`, `@Processor('monitor-checks')`) consumes the queue:
   - Performs a raw `http`/`https` GET with the monitor's `timeout`.
   - **Retries up to 2 times** on DOWN with a 5s sleep (avoids false-positive alerts from transient blips). 2xx/3xx is UP; everything else is DOWN.
   - Writes a `Check` row, recomputes `uptimePercent` from the last 100 checks, updates the `Monitor` summary fields.

3. **State transitions** — comparing previous vs. new `MonitorStatus`:
   - `!DOWN → DOWN`: creates an `Incident` (open) and fires `AlertsService.sendDownAlert` for every `AlertContact`.
   - `DOWN → UP`: closes the most recent open `Incident` (sets `resolved`, `endTime`, computed `duration` in seconds) and fires `sendRecoveryAlert`.

When changing this pipeline, keep these invariants in mind: the `jobId` scheme is what prevents duplicate dispatch within a minute; the retry loop is what suppresses noisy alerts; only the worker mutates `Monitor.status` and only on a status flip does `Incident` state change.

### Data model (`backend/prisma/schema.prisma`)
- `User` 1—* `Monitor` 1—* (`Check`, `Incident`, `AlertContact`).
- `Check` has a composite index on `(monitorId, checkedAt)` — the worker's recent-checks query and history endpoints rely on it.
- `MonitorStatus` enum is `PENDING | UP | DOWN`. New monitors start `PENDING`; the first successful check flips it. Code that reads `previousStatus` should treat `PENDING` like "not yet DOWN" (the worker's transition check uses `previousStatus !== 'DOWN' && newStatus === 'DOWN'` precisely so the first DOWN result still creates an incident).
- `onDelete: Cascade` is set on every relation off `Monitor`, so deleting a monitor wipes its checks, incidents, and alert contacts.

### Auth
JWT-based: `AuthService` issues tokens via `JwtService.sign({ sub, email })`; passport-jwt strategy validates them; controllers guard routes with the JWT guard and pull `userId` from `req.user`. Service methods (e.g. `MonitorsService.findOne`, `update`, `remove`) re-check `monitor.userId === userId` and throw `ForbiddenException` — the row-level ownership check lives in the service layer, not the guard.

### Frontend
- App Router under `src/app/` with route folders: `login`, `register`, `dashboard`, `monitors`, `incidents`.
- `src/contexts/AuthContext.tsx` holds the JWT in `localStorage` under key `uptime_token`; `src/lib/api.ts` reads it and attaches `Authorization: Bearer ...` to every request.
- All API responses are typed as `any` in `api.ts` — when adding endpoints, follow the existing pattern rather than introducing a separate types layer.

## Environment variables

Backend (`backend/.env`): `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optional `PORT` (default 3001), `FRONTEND_URL` (default `http://localhost:3000`).

Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).
