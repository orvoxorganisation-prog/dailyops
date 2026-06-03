# DailyOps — production full-stack app

The daily operating system for a single company: SOP-enforced daily reports, task & goal
tracking, proof of work, productivity analytics, and complete admin user management — backed
by **real PostgreSQL**. No mock, demo, or seeded users: every account is created through the
signup flow, and every dashboard number is computed from live data.

**Stack:** Next.js 16 (App Router) · TypeScript · Auth.js v5 (Credentials, JWT) · Prisma 6 ·
PostgreSQL · Tailwind CSS v3 · shadcn/ui · bcryptjs · Zod.

---

## Quick start

```bash
# 1. Install
pnpm install

# 2. Configure environment
cp .env.example .env
#   - set DATABASE_URL to your Postgres instance
#   - set AUTH_SECRET:  npx auth secret   (or: openssl rand -base64 33)

# 3. Create the database schema
pnpm prisma migrate deploy        # applies prisma/migrations
pnpm prisma generate

# 4. Run
pnpm dev                          # http://localhost:3000
```

**The first account you create at `/signup` automatically becomes an Admin** (so the company
always has at least one administrator). Subsequent signups can choose Admin or Employee.

### Need a Postgres quickly?

- **Docker:** `docker run -d --name dailyops-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dailyops -p 5432:5432 postgres:16`
  then `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dailyops?schema=public"`
- **Neon / Supabase / RDS:** paste the connection string they give you into `DATABASE_URL`.

---

## How the requirements map to the code

### Authentication & sessions — `src/auth.ts`, `src/auth.config.ts`
- **Signup / login / logout** — `src/lib/actions/auth.ts` + `src/components/auth/*`.
- **Password hashing** — bcryptjs, 12 rounds (`src/lib/password.ts`).
- **Sessions** — Auth.js JWT strategy; role + active status carried in the token/session.
- **Password reset** — tokenized, hashed, 1-hour expiry (`PasswordResetToken`); emails via
  Resend when `RESEND_API_KEY` is set, otherwise the link is surfaced in dev.
- **Remember me** — 30-day session when checked, ~1 day otherwise (enforced in the session callback).
- **Protected routes** — edge middleware (`src/middleware.ts`) + the `authorized` callback
  redirect by role; server guards (`requireAuth` / `requireAdmin` / `requireEmployee`) re-check
  the DB on every request so disabled/deleted users lose access immediately.

### Roles & permissions (enforced on frontend **and** backend)
| | Employee | Admin |
|---|---|---|
| Own dashboard, reports, tasks, goals, proof | ✓ | — |
| Company dashboard, summary, performance, analytics, all reports | — | ✓ |
| Manage users (edit / disable / reactivate / delete / change role) | — | ✓ |
| Company settings | — | ✓ |

Backend enforcement lives in `src/lib/rbac.ts` (page guards), every server action
(`adminOrThrow` / `currentUserOrThrow` + ownership checks), and the middleware.

### User management & safety rules — `src/lib/actions/admin.ts`
- **Soft delete** (`active:false`, `deletedAt` set): access revoked immediately; reports,
  tasks and audit logs are retained.
- The system **always keeps ≥1 active admin** — demoting, disabling, or deleting the last
  admin is blocked (`wouldRemoveLastAdmin`).
- Employees cannot promote themselves, delete users, or reach admin pages (role-gated everywhere).
- Every privileged action is written to an **audit log** (`AuditLog`).

### Real data only
- Schema: `prisma/schema.prisma` (10 models, 9 enums).
- All dashboards/analytics/scores are computed by `src/lib/scoring.ts` over rows fetched in
  `src/lib/queries.ts`. Empty states render real zeros — there is no fabricated data anywhere.

---

## Project structure

```
prisma/schema.prisma            # PostgreSQL schema + migrations
src/
  auth.ts  auth.config.ts        # Auth.js v5 (Node + edge-safe split)
  middleware.ts                  # route protection
  lib/
    db.ts password.ts rbac.ts    # client, hashing, guards
    audit.ts notify.ts mail.ts   # audit log, notifications, email
    queries.ts serialize.ts      # data access + Prisma→DTO mappers
    scoring.ts                   # productivity scoring & analytics
    actions/{auth,employee,admin}.ts   # server actions (all mutations)
    useActions.ts                # client adapter → server actions
  app/
    (auth)/{login,signup,forgot-password,reset-password}
    (app)/{dashboard,reports,tasks,goals,proof}          # employee
    (app)/{company,summary,performance,analytics,all-reports,settings}
    (app)/admin/users                                     # admin user management
    api/auth/[...nextauth]/route.ts
  components/{auth,shell,views,ui}, charts.tsx, common.tsx
```

## Productivity score

`0.25·reportConsistency + 0.25·taskCompletion + 0.20·goalCompletion + 0.15·blockerControl + 0.15·sopCompliance`
(see `src/lib/scoring.ts`).

## Deploy (Vercel + managed Postgres)

1. Provision Postgres (Neon / Supabase / RDS); set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`.
2. `pnpm prisma migrate deploy` against the production database.
3. Deploy to Vercel. (Optional) add a daily cron hitting an admin "daily check" to fan out
   missing-report / blocker / at-risk notifications.

## Scripts
- `pnpm dev` · `pnpm build` · `pnpm start`
- `pnpm prisma migrate dev` (create a migration) · `pnpm prisma studio` (inspect data)
