# PubRoster

A lightweight roster app for hospitality teams. Create weekly schedules, assign shifts, and publish rosters by email or download as PDF. No enterprise bloat—just the essentials.

## Features

- **Staff management** – Add staff with names, emails, and roles
- **Schedule builder** – Drag-and-drop shifts onto a weekly grid (Mon–Sun)
- **Popular shifts** – Save common shift templates for quick reuse
- **Publish by email** – Send roster PDFs to staff via Resend
- **Download PDF** – Export roster anytime, works offline
- **Week picker** – Calendar view to jump to any week quickly

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + Prisma 7 |
| Auth | Better Auth (email/password) |
| Email | Resend |
| PDF | jsPDF + jspdf-autotable |
| UI | React 19, Tailwind CSS, Radix UI, shadcn-style components |
| Drag & drop | @dnd-kit |

## Prerequisites

- Node.js 20+
- PostgreSQL database
- (Optional) Resend account for email

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/EmreKaplan67/pubroster-hospitality-management
cd pubroster
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection (can be pooled) |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection for migrations |
| `BETTER_AUTH_SECRET` | Yes | Secret for auth (min 32 chars). Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | App URL: `http://localhost:3000` locally |
| `RESEND_API_KEY` | No | Resend API key for Publish; omit to use PDF only |
| `RESEND_FROM_EMAIL` | No | Sender email (verified domain) |
| `RESEND_FROM_NAME` | No | Sender name (default: PubRoster) |

### 3. Database setup

```bash
npx prisma migrate deploy
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  api/auth/[...all]   # Better Auth API route
  actions/            # Server actions (auth, shift, publish, etc.)
  dashboard/
    layout.tsx        # Dashboard layout + nav
    schedule/         # Roster grid, week picker, publish modal
    staff/            # Staff table
  page.tsx            # Landing page
components/
  ui/                 # Button, Dialog, Popover, etc.
  auth-modal.tsx      # Sign in / Sign up
lib/
  auth.ts             # Better Auth config
  prisma.ts           # Prisma client (pg adapter)
  schedule-week.ts    # Week utilities (Mon start, etc.)
  generate-roster-pdf.ts
  download-roster-pdf.ts
prisma/
  schema.prisma       # DB schema
  migrations/         # SQL migrations
  config.ts           # Prisma 7 config (DIRECT_URL)
```

## How It Works

1. **Auth** – Better Auth handles sign up, sign in, and sessions via cookies. All dashboard routes check `session` server-side and redirect if unauthenticated.

2. **Data** – Staff and shifts are scoped by `userId`. All server actions verify `session.user.id` before queries.

3. **Week model** – Weeks start Monday (ISO). `weekStart` is stored as `YYYY-MM-DD` (the Monday). Schedule and published roster are keyed by `(userId, weekStart)`.

4. **Publish flow** – Emails are sent first (Resend). If they succeed, the roster is marked published and locked. If Resend fails (e.g. rate limit), the roster stays editable. Beta has limited email capacity.

5. **PDF** – Generated client-side with jsPDF. No server needed for download.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Generate Prisma client + Next.js build |
| `npm run vercel-build` | For Vercel: migrate DB + build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Beta Disclaimer

The free beta has limited email capacity. Publish may fail if Resend limits are reached. Download PDF always works.
