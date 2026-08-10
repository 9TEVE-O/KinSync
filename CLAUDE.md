# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview

**KinSync** — "Your family, in sync." A family-coordination SaaS scaffold: shared
calendar events, family membership management, magic-link authentication, and
Stripe-powered billing, built as a TypeScript monorepo (npm workspaces + Turborepo).

Core capabilities:
- **Passwordless auth** — magic-link email sign-in, JWT-backed sessions (7-day TTL)
- **Family management** — create/join families, manage members (`OWNER`/`ADMIN`/`MEMBER`) and shared events
- **Billing** — Stripe checkout, customer portal, subscription webhooks
- **Email** — transactional emails (magic links) via Nodemailer/SMTP, MailHog for local dev

## Monorepo structure

```text
KinSync/
├── apps/
│   ├── web/          Next.js 15 frontend (React 19, App Router)         → :3000
│   └── api/          Express 4 API server (TypeScript, ESM)             → :3001
├── packages/
│   ├── auth/         JWT sessions, magic-link helpers   (@kinsync/auth)
│   ├── billing/      Stripe checkout, portal, webhook   (@kinsync/billing)
│   ├── db/            Prisma schema, client, migrations, seed (@kinsync/db)
│   └── email/        Nodemailer transport, templates    (@kinsync/email)
├── docs/              architecture.md, deployment.md, environment-variables.md, getting-started.md
├── tests/             Root-level tests (currently: LICENSE file validation)
├── .env.example       All environment variables, documented and classified
├── docker-compose.yml Local Postgres 16 + MailHog
├── turbo.json         Turbo task pipeline
└── package.json       Workspace root (npm workspaces + Turbo)
```

Internal packages use the `@kinsync/` scope. Import by package name — never by
relative path across a package boundary.

**Dependency direction** (enforced by convention, not tooling — respect it):
```text
apps/api   → @kinsync/auth, @kinsync/billing, @kinsync/db, @kinsync/email
apps/web   → API over HTTP only (no direct package imports)
@kinsync/auth    → @kinsync/db
@kinsync/billing → @kinsync/db
@kinsync/email   (standalone)
@kinsync/db      (standalone)
```
No package imports from `apps/`. Apps never import from each other.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Monorepo | npm workspaces + Turborepo 2.x |
| Language | TypeScript 5.7, ESM (`"type": "module"`) |
| API | Express 4.21, Helmet, CORS, Zod validation, express-rate-limit |
| Frontend | Next.js 15.2, React 19, App Router |
| Database | PostgreSQL via Prisma ORM 6.x |
| Auth | Magic-link email + JWT (`jose`), bcryptjs, 7-day sessions |
| Billing | Stripe SDK 17.x (checkout sessions, customer portal, webhooks) |
| Email | Nodemailer, MailHog for local dev |
| Node | ≥ 20, npm ≥ 10 |

## Commands

Run from the monorepo root unless noted. Turbo fans these out to every workspace.

```bash
npm install              # also runs postinstall → prisma generate
npm run dev               # start web + api concurrently (turbo, watch mode)
npm run build              # build all apps/packages
npm run lint                # per-workspace: apps/web runs `next lint`; apps/api,
                             # packages/auth/billing/email run `tsc --noEmit`;
                             # packages/db has no lint script (turbo skips it)
npm run typecheck            # tsc --noEmit in every workspace, including packages/db
                             # — NOT the same set of checks as `npm run lint`
npm run test                  # turbo run test — no workspace defines a `test`
                               # script today, so this is currently a no-op
npm run db:migrate             # prisma migrate dev
npm run db:seed                  # prisma db seed (depends on db:migrate)
npm run db:studio                 # prisma studio (browser GUI)
```

Per-workspace:
```bash
cd apps/api && npm run dev     # ts-node-dev --respawn --transpile-only
cd apps/api && npm run build    # tsc → dist/
cd apps/web && npm run dev       # next dev
cd apps/web && npm run build      # next build
```

Local services:
```bash
docker compose up -d      # Postgres :5432, MailHog SMTP :1025 / UI :8025
docker compose down -v    # stop + wipe Postgres data
```

Local Stripe webhook testing:
```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
# paste the printed secret into .env as STRIPE_WEBHOOK_SECRET
```

Full first-time setup is in `docs/getting-started.md`; env var reference is in
`docs/environment-variables.md` and `.env.example`.

## Data model

Source of truth: `packages/db/prisma/schema.prisma`. After editing it, always run
`npm run db:migrate` (creates + applies a migration) before writing code that
depends on the change — the generated Prisma client will otherwise be stale.

```text
User ──► Session            (auth, cascade delete)
User ──► Subscription       (billing, one-to-one, cascade delete)
User ──► FamilyMember ──► Family
                           Family ──► FamilyEvent (cascade delete)
User ──► AuditLog           (SetNull on user delete — logs survive)
```

All IDs are `cuid()` strings. Models map to snake_case tables via `@@map`.
Every relation cascades on delete except `AuditLog.user`, which sets null so
audit history isn't destroyed when a user is removed.

## API surface (`apps/api`, base `http://localhost:3001`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | No | `{ status, timestamp }` |
| POST | `/api/auth/magic-link` | No | Rate-limited 5/15min per IP |
| GET | `/api/auth/verify?token=` | No | Exchanges JWT for a session token |
| POST | `/api/auth/logout` | Yes | |
| GET | `/api/auth/me` | Yes | |
| GET | `/api/families` | Yes | List the current user's families (with members) |
| POST | `/api/families` | Yes | Create a family; creator becomes `OWNER` |
| GET | `/api/families/:id` | Yes | Get one family (with members + events) |
| * | `/api/billing/*` | Yes / Stripe signature | Checkout, portal, webhook |

- `requireAuth` (`apps/api/src/middleware/requireAuth.ts`) reads
  `Authorization: Bearer <token>`, resolves the user via `@kinsync/auth`, and
  attaches `req.user` (module-augmented on Express's `Request`).
- `errorHandler` (`apps/api/src/middleware/errorHandler.ts`) is the sole error
  path — logs the full error server-side, returns `{ error: message }` in
  development or a generic `{ error: "Internal server error" }` otherwise.
  Route handlers should `catch` and call `next(err)`, not respond directly.
- `/api/billing/webhook` is mounted with `express.raw({ type: "application/json" })`
  **before** the global `express.json()` — Stripe requires the raw body to verify
  the signature. Do not reorder this or add JSON parsing ahead of it.
- The family router (`apps/api/src/routes/families.ts`) currently implements only
  the three routes above — no update/delete, no membership management, no event
  endpoints. Don't assume broader CRUD exists; check the router before referencing
  a family/member/event endpoint that isn't in this table.

## Coding conventions

- **TypeScript strict mode everywhere** (`tsconfig.base.json`): `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch` are all on. No `any`; no unexplained `@ts-ignore`.
- **ESM only** — imports use explicit `.js` extensions even for `.ts` source
  (e.g. `import { foo } from "./bar.js"`), required by `NodeNext` module resolution.
- **Env var access**: always `process.env["VAR_NAME"]` (bracket notation), and
  only inside the package/app that owns the concern — this is the existing
  pattern throughout `apps/api` and every `packages/*`.
- **Zod for all external input** — validate request bodies/query params before
  use (`.parse()` to throw, `.safeParse()` to handle inline).
- **Async route handlers**: wrap in try/catch and call `next(err)`; never let a
  promise reject unhandled.
- **No business logic in route handlers** — route handlers translate HTTP ↔
  domain only. Logic lives in the relevant `packages/*` module.
- **Prisma**: import the singleton `prisma` client from `@kinsync/db`
  (`packages/db/src/index.ts`). Never instantiate `new PrismaClient()` elsewhere.
- **Section-divider comments** (`// ──────...──────`) are the existing style for
  grouping logical sections in `index.ts`/route files — match it when extending
  those files, don't introduce a different convention.

## Adding a feature (established pattern)

1. Extend `packages/db/prisma/schema.prisma`
2. `npm run db:migrate` (creates + applies the migration)
3. Add domain/service helpers to the owning package (`auth`, `billing`, `email`, `db`)
4. Add route handlers in `apps/api/src/routes/`
5. Add pages/components in `apps/web/src/app/`

Don't copy-paste logic between routes — shared behavior belongs in `packages/`.

## Constraints — do not break these

- **Never commit secrets.** `.env` is gitignored; `.env.example` is the
  documentation surface. New env vars must be added there with a
  `[REQUIRED]` / `[OPTIONAL]` / `[3RD PARTY]` marker and a comment on how to
  obtain/generate the value. Do not give secrets default values.
- **Stripe webhook raw body** — see API surface section above; do not add
  `express.json()` ahead of `/api/billing/webhook`.
- **Auth rate limiting** — `POST /api/auth/magic-link` must stay rate-limited
  (currently 5 requests / 15 min / IP). Don't remove or loosen it without being asked.
- **`nodemailer` must stay ≥ 8.0.5** (GHSA-rcmh-qjqh-p98v — high-severity DoS in
  addressparser). Check this if touching `packages/email` dependencies.
- **`apps/web` has no direct package imports** — it talks to the API over HTTP
  only. A `@kinsync/*` import inside `apps/web` is a bug, not a shortcut.
- **Cascade deletes are intentional** — deleting a `User` removes their
  sessions, family memberships, and subscription; only `AuditLog` survives
  (`userId` is nulled). Don't add `onDelete` overrides without discussing why.

## Testing

`npm run test` runs `turbo run test`, which fans out to each workspace's `test`
script — but no workspace (`apps/*`, `packages/*`) currently defines one, so
`npm run test` exits 0 having run nothing. It does **not** execute anything.

The one real suite in the repo, `tests/license.test.js`, lives outside the
workspaces (`apps/*`/`packages/*`) turbo scans, and no script invokes it. Run it
directly if you need it:
```bash
node --test tests/license.test.js
```
It asserts the LICENSE file is present, MIT, and correctly attributed to
`9TEVE-O` with the current copyright year. Don't assume any test coverage
exists for `apps/api`, `apps/web`, or `packages/*` — there is none yet.

## CI

Only one GitHub Actions workflow exists: `.github/workflows/copilot-setup-steps.yml`.
It runs on pushes/PRs that touch that file, and on `workflow_dispatch`; it installs
the Hermes Agent (a third-party Copilot cloud-agent tool from NousResearch, fetched
via `curl | bash` from a GitHub-hosted install script) and verifies the install
directory exists. There is no CodeQL workflow, no secret-scanning workflow, and no
test/lint/build workflow in this repo currently — `.github/copilot-instructions.md`
describes those as existing CI gates, but they are not present on disk. If you add
CI, verify against the actual `.github/workflows/` contents rather than that file.

## Known rough edges

- `npm install` triggers `prisma generate` via `postinstall`; in network-restricted
  sandboxes the Prisma telemetry call to `checkpoint.prisma.io` may fail and print
  a warning — this is non-fatal. If the generated client ends up missing, run:
  ```bash
  cd packages/db && PRISMA_GENERATE_SKIP_AUTOINSTALL=true npx prisma generate
  ```
- After pulling schema changes, run `npm run db:migrate` (or `npx prisma generate`
  in `packages/db`) before typechecking — a stale generated client causes
  confusing Prisma type errors.
- `docker compose up -d` failing with "address already in use" on 5432/1025 means
  a previous compose stack is still running: `docker compose down && docker compose up -d`.

## Related docs

| Doc | Covers |
|-----|--------|
| `README.md` | Quick start, audit rubric |
| `docs/getting-started.md` | Full local setup walkthrough, first sign-in flow |
| `docs/architecture.md` | Module boundaries, data model, auth/billing sequence diagrams |
| `docs/environment-variables.md` | Every env var, required vs. optional vs. third-party |
| `docs/deployment.md` | Railway/Render/Fly.io/Docker deploy paths, migration flow, rollback story |
| `.github/copilot-instructions.md` | Equivalent guidance written for GitHub Copilot — largely overlaps this file; treat this file as authoritative for Claude Code and re-verify against source before trusting either on CI/tooling claims |
