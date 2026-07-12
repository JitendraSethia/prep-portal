# Prep Portal — NEET / JEE / CUET Educational Platform

A full-stack, exam-preparation portal for Indian competitive exams. Students take
timer-based mock tests and previous-year papers, get **AI-generated step-by-step
explanations**, and administrators manage a large question bank and view **detailed
per-student analytics** (who logged in, what they visited, and time spent on each
page/question).

Built as a single **Next.js 16** app (App Router, TypeScript) with **PostgreSQL +
Prisma**, **Auth.js (NextAuth v5)** for authentication, and the **OpenAI API** for
explanations.

---

## Features

- **Interactive exam portal** — countdown timer with auto-submit, question palette
  (answered / marked / skipped), mark-for-review, free navigation, per-question time
  tracking, resume-in-progress, and instant server-side scoring (+4 / −1, configurable).
- **AI explanations** — streamed, step-by-step solutions per question (OpenAI), cached
  in the database so repeat views are instant. Graceful fallback to the author solution
  when no API key is set.
- **Question bank** — Exam → Subject → Topic → Subtopic taxonomy, tags, MCQ (single /
  multiple) and numerical questions, previous-year metadata (year, shift). Admin CRUD +
  **bulk CSV/JSON import** that auto-creates subjects/topics.
- **Admin analytics dashboard** — KPIs, activity trend, event-type breakdown, most-
  attempted papers, most-missed questions, time-by-page, and a **per-student drilldown**
  (pages visited, questions viewed, time on each, attempt history, event timeline).
- **Secure auth** — email/password (bcrypt) + Google OAuth, role-based access
  (`STUDENT` / `ADMIN`), route protection via server-component guards.

## Tech stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Framework | Next.js 16 (App Router, RSC, Server Actions), TS   |
| UI        | Tailwind CSS v4, custom component primitives, Recharts |
| Auth      | Auth.js / NextAuth v5 + Prisma adapter             |
| Database  | PostgreSQL + Prisma ORM                            |
| AI        | OpenAI (swappable via `lib/ai/provider.ts`)        |

---

## Getting started (local)

### 1. Prerequisites
- Node.js **20.9+**
- A PostgreSQL database. Either:
  - **Docker:** `docker compose up -d` (starts Postgres on `localhost:5432`), or
  - a free cloud Postgres (e.g. [Neon](https://neon.tech)) — put its URL in `DATABASE_URL`.

### 2. Configure environment
```bash
cp .env.example .env
# then edit .env — at minimum set AUTH_SECRET (npx auth secret) and OPENAI_API_KEY
```

### 3. Install, migrate, seed
```bash
npm install
npm run db:migrate      # creates tables (prisma migrate dev)
npm run db:seed         # loads demo exams, questions, papers & accounts
```

### 4. Run
```bash
npm run dev             # http://localhost:3000
```

### Demo accounts (from the seed)
| Role    | Email               | Password      |
| ------- | ------------------- | ------------- |
| Admin   | `admin@prep.test`   | `Admin@12345` |
| Student | `student@prep.test` | `Student@123` |

> If `OPENAI_API_KEY` is empty, the app still runs — "Explain with AI" falls back to the
> stored reference solution. Google login requires `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`;
> email/password works without it.

---

## Verifying it works (end-to-end)

1. **Auth** — sign up at `/signup`, or log in with a demo account. Log out and hit
   `/dashboard` → redirected to `/login`. Log in as the student and open `/admin` →
   redirected away (blocked).
2. **Exam** — as the student, open a paper (e.g. *NEET UG 2023 — Sample Mock Test*),
   **Start test**, answer questions, mark one for review, watch the timer, then submit.
   Verify the score, negative marking, subject breakdown and per-question time on the
   results page.
3. **AI** — on the results page click **Explain with AI**; confirm streamed output. Click
   again (or reopen) → served instantly from the cache.
4. **Admin** — log in as admin. Create/edit a question, create a paper and attach
   questions, publish it, and bulk-import via `/admin/import`.
5. **Analytics** — after browsing and taking a test, open `/admin` and
   `/admin/students/<id>` to confirm the student's pages, questions and time-on-page are
   recorded.

Static checks:
```bash
npm run typecheck       # tsc --noEmit
npm run build           # production build
```

---

## Project structure

```
app/
  (auth)/            login, signup, auth server actions
  (app)/             student area — dashboard, papers, history, profile, results
  (exam)/test/[id]   full-screen exam player
  (admin)/admin/     analytics, questions, papers, import, students
  api/
    auth/[...nextauth]  Auth.js handlers
    track              analytics event ingestion (sendBeacon)
    explain            streaming AI explanation (+ DB cache)
components/           ui primitives, exam player, admin widgets, analytics
lib/
  db.ts              Prisma client singleton
  auth.ts            session/role guards (requireUser / requireAdmin)
  ai/provider.ts     OpenAI wrapper (swap providers here)
  exam/              scoring, question/response parsing, player DTOs
  actions/           server actions (attempts, admin, profile)
  data/              read-side aggregations (taxonomy, analytics)
  analytics/         client tracker helper
prisma/
  schema.prisma      full data model
  seed.ts            demo data
auth.ts              NextAuth config (providers, callbacks, events)
```

## Analytics / tracking model

`AnalyticsEvent` rows capture `PAGE_VIEW`, `QUESTION_VIEW`, `EXAM_START`, `EXAM_SUBMIT`,
`AI_EXPLAIN`, `LOGIN`, `SIGNUP` with `userId`, `sessionId`, `path`, `entityType/entityId`,
and `durationMs`. Page dwell time is measured client-side (`components/analytics-tracker.tsx`)
and flushed via `navigator.sendBeacon` on route change and tab hide; per-question time is
tracked inside the exam player. The ingestion route resolves the user from the session
cookie server-side, so `userId` cannot be spoofed.

---

## Deployment

**Docker (any host / AWS ECS / App Runner):**
```bash
docker build -t prep-portal .
docker run -p 3000:3000 --env-file .env prep-portal
# container runs `prisma migrate deploy` then starts Next.js
```

**Vercel + Neon:** import the repo, set env vars (`DATABASE_URL`, `AUTH_SECRET`,
`AUTH_GOOGLE_*`, `OPENAI_API_KEY`), and run `npm run db:deploy` against the production DB.

For AWS: host Postgres on **RDS**, run the container on **ECS/Fargate** or **App Runner**,
and store secrets in **Secrets Manager** / task env.

## Scripts

| Script              | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run dev`       | Dev server                       |
| `npm run build`     | Production build                 |
| `npm run start`     | Start production server          |
| `npm run typecheck` | TypeScript check                 |
| `npm run db:migrate`| Create/apply migrations (dev)    |
| `npm run db:deploy` | Apply migrations (prod)          |
| `npm run db:seed`   | Seed demo data                   |
| `npm run db:studio` | Prisma Studio (DB browser)       |
