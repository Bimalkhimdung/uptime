# Uptime Monitor

A full-stack uptime monitoring system — monitors your websites every minute, alerts you when things go down, and logs every check.

## 🏗️ Architecture

```
frontend/   → Next.js 15 dashboard
backend/    → NestJS API + BullMQ workers
postgres    → PostgreSQL 16 (data store)
redis       → Redis 7 (job queue)
```

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL running locally
- Redis running locally

### 1. Start Postgres & Redis

```bash
# PostgreSQL
createdb uptime_db

# Redis (macOS)
brew services start redis

# Or using Docker
docker-compose up postgres redis -d
```

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev
```

API runs on: http://localhost:3001  
Swagger docs: http://localhost:3001/api/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs on: http://localhost:3000

---

## 🐳 Docker (Full Stack)

```bash
# Build and start everything
docker-compose up --build

# Or just the infra (Postgres + Redis)
docker-compose up postgres redis -d
```

---

## 📦 Backend Environment Variables

Copy `backend/.env` and fill in your SMTP credentials:

```env
DATABASE_URL="postgresql://uptime:uptime_secret@localhost:5432/uptime_db"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
```

---

## 🗺️ API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/monitors` | List monitors |
| POST | `/api/monitors` | Create monitor |
| GET | `/api/monitors/:id` | Monitor detail |
| PATCH | `/api/monitors/:id` | Update monitor |
| DELETE | `/api/monitors/:id` | Delete monitor |
| PATCH | `/api/monitors/:id/pause` | Pause monitor |
| PATCH | `/api/monitors/:id/resume` | Resume monitor |
| GET | `/api/monitors/:id/checks` | Check history |
| GET | `/api/monitors/:id/incidents` | Incidents |
| GET | `/api/incidents` | All incidents |

---

## 🔧 Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript, Prisma ORM
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt
- **Email**: Nodemailer

---

## 📊 Data Flow

```
User adds monitor
      ↓
Saved in PostgreSQL
      ↓
Immediate check queued → BullMQ
      ↓
Scheduler (every 1min) dispatches due checks
      ↓
Worker performs HTTP request (with retries)
      ↓
Saves check result to DB
      ↓
Status change? → Create incident + Send email alert
```
