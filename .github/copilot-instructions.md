# GitHub Copilot Instructions — KinSync + Hermes Agent

## Project overview

**KinSync** is a family-coordination SaaS scaffold. Its tagline is "Your family, in sync." It provides shared calendar events, family membership management, magic-link authentication, and Stripe-powered billing in a TypeScript monorepo. Key capabilities:

- **Passwordless auth** — magic-link email sign-in via JWT sessions
- **Family management** — create/join families, manage members and shared events
- **Billing** — Stripe-powered subscription checkout and billing portal
- **Email** — transactional emails (magic links, invites, welcome messages) via Nodemailer/SMTP

**Hermes Agent** (by [Nous Research](https://nousresearch.com)) is the self-improving AI coding agent configured to assist development in this repository. It is installed via the `copilot-setup-steps` workflow (`.github/workflows/copilot-setup-steps.yml`) and runs at `~/.hermes/hermes-agent`. Hermes provides a persistent, learning-loop agent with memory, skill creation, MCP integration, and multi-platform messaging (Telegram, Discord, Slack, etc.).

---

## Monorepo structure

```
KinSync/
├── apps/
│   ├── web/          Next.js 15 frontend (React App Router, TypeScript)  → http://localhost:3000
│   └── api/          Express 4 API server (TypeScript, ESM)              → http://localhost:3001
├── packages/
│   ├── auth/         JWT sessions, magic-link helpers  (@kinsync/auth)   (entry: src/index.ts)
│   ├── billing/      Stripe checkout, portal, webhook  (@kinsync/billing) (entry: src/index.ts)
│   ├── db/           Prisma schema, client, migrations (@kinsync/db)     (entry: prisma/schema.prisma)
│   └── email/        Nodemailer transport, templates   (@kinsync/email)  (entry: src/index.ts)
├── docs/             Architecture, deployment, env-var reference
├── .env.example      All environment variables with explanations
├── docker-compose.yml  Local Postgres 16 + MailHog
├── turbo.json        Turbo task pipeline
└── package.json      Workspace root (npm workspaces + Turbo)
```

**Internal package names** use the `@kinsync/` scope. Import packages by name — never by relative path across package boundaries.

**Dependency direction** (packages never import from apps; apps never import from each other):

```
apps/api   → @kinsync/auth, @kinsync/billing, @kinsync/db, @kinsync/email
apps/web   → API via HTTP only (no direct package imports)
@kinsync/auth    → @kinsync/db
@kinsync/billing → @kinsync/db
@kinsync/email   (standalone)
@kinsync/db      (standalone)
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Monorepo | npm workspaces + Turborepo |
| Language | TypeScript 5, ESM (`"type": "module"`) |
| API | Express 4, Helmet, CORS, Zod for validation, express-rate-limit |
| Frontend | Next.js 15, React App Router |
| Database | PostgreSQL via Prisma ORM |
| Auth | Magic-link (email) + JWT (`jose` library), 7-day sessions |
| Billing | Stripe (checkout sessions, customer portal, webhooks) |
| Email | Nodemailer with MailHog for local dev |
| Testing | (add per package) |
| Linting | TypeScript strict mode |
| Node | ≥ 20, npm ≥ 10 |

---

## Key architectural rules

1. **Package isolation**: No package imports from `apps/`. Apps import from packages, never from each other. The dependency graph is:
   ```
   apps/api   → @kinsync/auth, @kinsync/billing, @kinsync/db, @kinsync/email
   apps/web   → (HTTP calls to API only — no direct package imports yet)
   @kinsync/auth    → @kinsync/db
   @kinsync/billing → @kinsync/db
   @kinsync/email   (standalone)
   @kinsync/db      (standalone)
   ```

2. **Thin route handlers**: Business logic lives in `packages/`, not in route handlers. Route handlers only translate HTTP ↔ domain (parse request, call package function, send response).

3. **Environment over configuration**: Third-party credentials (Stripe, SMTP) are injected via environment variables. Packages validate required vars at call time and throw descriptive errors — never silently misconfigure.

4. **Single place per feature**: Adding a domain concept means: extend `schema.prisma` → run migration → add helpers to the relevant package → add route handlers → add pages/components.

---

## Data model (Prisma)

Located at `packages/db/prisma/schema.prisma`. Key models:

| Model | Purpose |
|-------|---------|
| `User` | Core user record (cuid ID, email unique, emailVerified) |
| `Session` | Auth sessions (token, expiresAt, 7-day TTL) |
| `Family` | Family group (name, description) |
| `FamilyMember` | Join table: User ↔ Family with role (`OWNER`, `ADMIN`, `MEMBER`) |
| `FamilyEvent` | Calendar events scoped to a Family (startAt, endAt) |
| `Subscription` | Stripe subscription (one-to-one with User) |
| `AuditLog` | Append-only audit trail (userId optional, action, resource) |

IDs are cuid strings. Cascade deletes are set on all child relations. The `@@map` directive maps models to snake_case table names.

---

## API routes

Base path: `http://localhost:3001`

| Method | Path | Auth required | Description |
|--------|------|--------------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/auth/magic-link` | No | Send magic-link email (rate-limited: 5/15 min) |
| GET | `/api/auth/verify?token=` | No | Exchange JWT for session token |
| POST | `/api/auth/logout` | Yes | Invalidate session |
| GET | `/api/auth/me` | Yes | Return current user |
| * | `/api/families/*` | Yes | Family CRUD + members + events |
| * | `/api/billing/*` | Yes/Stripe | Stripe checkout, portal, webhook |

**Auth middleware** (`apps/api/src/middleware/requireAuth.ts`): reads `Authorization: Bearer <token>` header, validates the session via `@kinsync/auth`, and attaches `req.user` (extends Express `Request` type).

**Error handler** (`apps/api/src/middleware/errorHandler.ts`): catches Zod `ZodError` (400), known API errors, and falls back to 500. Always returns `{ error: string }`.

**Webhook route** (`/api/billing/webhook`): uses `express.raw()` instead of `express.json()` — Stripe needs the raw body for signature verification.

---

## Coding conventions

- **TypeScript strict mode** — no `any`, no `ts-ignore` without a comment explaining why.
- **ESM only** — use `.js` extensions in imports even for `.ts` source files (e.g., `import { foo } from "./bar.js"`).
- **Zod for all external input** — validate request bodies and query params with Zod schemas before use. Parse with `.parse()` (throws) or `.safeParse()` (returns result object).
- **Async/await with try/catch → next(err)** — all async route handlers must pass errors to `next(err)`.
- **Environment variable access**: always use `process.env["VAR_NAME"]` (bracket notation) — never `process.env.VAR_NAME`.
- **No logic in routes**: extract domain logic to the appropriate `packages/` module.
- **Prisma**: always import `prisma` client from `@kinsync/db`. Never instantiate a new PrismaClient in app code.
- **Comments**: use `// ──────────────────────────────────────────` section dividers for logical groupings (consistent with existing code style).
- **cuid IDs**: all models use `@id @default(cuid())` — generate or reference IDs as strings.

---

## Hermes Agent integration

The Hermes Agent is installed into the Copilot environment via the workflow at `.github/workflows/copilot-setup-steps.yml`. It installs from the official NousResearch installer (`https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh`) to `~/.hermes/hermes-agent`.

**Key Hermes concepts relevant to this repo:**
- **Skills**: reusable procedural knowledge Hermes creates after complex tasks. Skills live in `~/.hermes/skills/`.
- **Memory**: Hermes persists context across sessions. Use `MEMORY.md` / `USER.md` patterns for persistent context.
- **Context files**: `AGENTS.md` at the repo root (if present) is automatically loaded by Hermes as workspace instructions. Write architectural decisions and constraints there.
- **MCP servers**: Hermes supports Model Context Protocol — can be extended with additional tool servers.
- **Terminal backends**: Hermes can run tools locally, in Docker, via SSH, or on serverless platforms (Daytona, Modal).

**Hermes CLI quick reference (for Copilot agent tasks):**
```bash
hermes              # Start interactive session
hermes model        # Switch LLM provider/model
hermes tools        # Configure enabled tools
hermes doctor       # Diagnose installation issues
hermes update       # Update to latest version
```

---

## Local development setup

```bash
# Prerequisites: Node ≥ 20, npm ≥ 10, Docker ≥ 24
npm install
cp .env.example .env       # then edit .env — set JWT_SECRET at minimum
docker compose up -d        # start Postgres + MailHog
npm run db:migrate          # apply Prisma migrations
npm run db:seed             # seed with sample data
npm run dev                 # starts all apps via Turbo
# Web:  http://localhost:3000
# API:  http://localhost:3001
# Mail: http://localhost:8025 (MailHog UI)
```

**Turbo scripts (run from repo root):**

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start all apps in watch mode |
| `npm run build` | Build all packages and apps |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Run all tests |
| `npm run typecheck` | TypeScript type-check all workspaces |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

---

## Exact build / test / lint / run commands

All commands are run from the **monorepo root** unless otherwise stated.

### Build

```bash
npm run build          # builds all apps and packages via Turbo
```

### Lint / type-check

```bash
npm run lint           # runs tsc --noEmit in every workspace
npm run typecheck      # alias – same as lint
```

### Tests

```bash
npm run test           # runs test scripts in every workspace via Turbo
```

> **Note:** no test framework is wired up yet. The `test` script is a no-op in
> each workspace until tests are added. Running `npm run test` is safe but
> produces no output.

### Individual workspace commands

```bash
# API only
cd apps/api && npm run dev          # ts-node-dev hot-reload
cd apps/api && npm run build        # tsc → dist/
cd apps/api && npm run start        # node dist/index.js

# Web only
cd apps/web && npm run dev          # next dev
cd apps/web && npm run build        # next build
cd apps/web && npm run start        # next start

# Database (run from monorepo root)
npm run db:migrate                  # prisma migrate dev
npm run db:seed                     # prisma db seed
npm run db:studio                   # prisma studio (browser GUI)
```

### Optional – local Stripe webhook forwarding

```bash
stripe login
stripe listen --forward-to localhost:3001/api/billing/webhook
# copy the printed webhook secret → STRIPE_WEBHOOK_SECRET in .env
```

---

## Runtime / tool versions

| Tool | Required version | Notes |
|------|-----------------|-------|
| Node.js | ≥ 20 | LTS preferred |
| npm | ≥ 10 | bundled with Node 20 |
| Docker | ≥ 24 | for local Postgres + MailHog |
| Docker Compose | ≥ 2.20 | bundled with Docker Desktop |
| TypeScript | 5.7.x | dev dependency in every workspace |
| Next.js | 15.x | `apps/web` |
| Express | 4.x | `apps/api` |
| Prisma | 6.x | `packages/db` |
| Stripe SDK | 17.x | `packages/billing` |
| jose (JWT) | 5.x | `packages/auth` |
| Nodemailer | 8.x | `packages/email` (≥ 8.0.5 required – see security note) |
| Turbo | 2.x | task orchestration |

---

## Key files reference

| File/Directory | Purpose |
|---------------|---------|
| `packages/db/prisma/schema.prisma` | Single source of truth for the data model |
| `packages/auth/src/index.ts` | JWT signing/verification, session CRUD, magic-link user helpers |
| `packages/billing/src/index.ts` | Stripe customer, checkout, portal, webhook processing |
| `packages/email/src/index.ts` | Nodemailer transport, `sendMagicLink()` and other templates |
| `packages/db/src/index.ts` | Exports `prisma` singleton client + Prisma types |
| `apps/api/src/index.ts` | Express app setup: security, routes, error handler |
| `apps/api/src/middleware/requireAuth.ts` | Session validation middleware |
| `apps/api/src/middleware/errorHandler.ts` | Centralised error → HTTP response mapping |
| `apps/api/src/routes/auth.ts` | Auth endpoints (magic-link, verify, logout, me) |
| `apps/api/src/routes/families.ts` | Family + member + event endpoints |
| `apps/api/src/routes/billing.ts` | Stripe checkout, portal, webhook endpoints |
| `.env.example` | Authoritative list of all environment variables |
| `docs/architecture.md` | Module boundaries, data model, auth & billing flows |
| `docs/deployment.md` | Railway, Render, Fly.io, Docker deployment guides |
| `.github/workflows/copilot-setup-steps.yml` | Installs Hermes Agent into the Copilot environment |

---

## CI / pre-merge checks

The following GitHub Actions workflows run on every pull request:

| Workflow | File | What it checks |
|----------|------|---------------|
| **CodeQL – Advanced Security Scanning** | `.github/workflows/codeql.yml` | Static analysis for security vulnerabilities |
| **Secret & Credential Scanning** | `.github/workflows/secret-scan.yml` | Detects accidentally committed secrets |
| **Copilot code review** | (dynamic) | Automated PR review by Copilot |
| **Copilot cloud agent setup** | `.github/workflows/copilot-setup-steps.yml` | Pre-installs agent tooling |

All four checks must pass before a PR can be merged.

**Security notes embedded in the codebase:**
- `nodemailer` must stay at **≥ 8.0.5** (GHSA-rcmh-qjqh-p98v, high-severity DoS in addressparser).
- `POST /api/auth/magic-link` is rate-limited to **5 requests / 15 min per IP** via `express-rate-limit` (fixes CodeQL `js/missing-rate-limiting`).

---

## Important constraints

- **Never commit secrets** — `.env` is gitignored. Use `.env.example` for documentation.
- **Stripe webhook**: `/api/billing/webhook` must use `express.raw()` middleware, not `express.json()`. Do not change this.
- **Rate limiting on auth**: the magic-link endpoint is rate-limited at 5 requests per 15 minutes per IP. Do not remove this.
- **Cascade deletes**: all Prisma relations use `onDelete: Cascade` — deleting a User removes all their sessions, family memberships, subscription, and audit logs.
- **No cross-app imports**: `apps/web` must communicate with `apps/api` over HTTP only.
- **Migration required after schema changes**: after editing `schema.prisma`, run `npm run db:migrate` to generate and apply the migration.

---

## Common failure modes and workarounds

### `prisma generate` fails at install time

**Symptom:** `npm install` prints a network error about `checkpoint.prisma.io`.  
**Cause:** Prisma's postinstall hook calls home to a telemetry endpoint that is blocked in restricted network environments (e.g., the Copilot cloud agent sandbox).  
**Workaround:** The app still works; ignore the telemetry error. If the generated client is missing, run:

```bash
cd packages/db && PRISMA_GENERATE_SKIP_AUTOINSTALL=true npx prisma generate
```

### `docker compose up -d` fails (port already in use)

**Symptom:** `bind: address already in use` on port 5432 or 1025.  
**Workaround:**

```bash
docker compose down        # stop existing containers
docker compose up -d       # restart
```

### TypeScript build fails after pulling new schema changes

**Symptom:** Type errors related to Prisma models after a `git pull`.  
**Cause:** The generated Prisma client is stale.  
**Fix:**

```bash
npm run db:migrate         # applies new migrations
# postinstall regenerates the client automatically; or run manually:
cd packages/db && npx prisma generate
```

### `next build` fails with "Module not found"

**Symptom:** Import errors during `apps/web` build.  
**Cause:** `apps/web` does **not** import workspace packages directly (it communicates with the API over HTTP). Any direct package import in `apps/web` is a bug.  
**Fix:** Remove the package import and replace with an `fetch`/`axios` API call.

### Rate-limit errors in development (`429 Too Many Requests`)

**Symptom:** `POST /api/auth/magic-link` returns 429 repeatedly during dev/testing.  
**Cause:** The 5 req / 15 min rate limiter is active even in `NODE_ENV=development`.  
**Workaround:** Wait 15 minutes, or restart the API process (the in-memory window resets).

### Stripe webhook signature verification fails (`400 Bad Request`)

**Symptom:** `POST /api/billing/webhook` always returns 400 with a signature error.  
**Cause:** Either `STRIPE_WEBHOOK_SECRET` is wrong, or the raw-body middleware is not running for that route.  
**Fix:** Ensure `STRIPE_WEBHOOK_SECRET` matches the secret printed by `stripe listen`. Do **not** add `express.json()` middleware before the `/api/billing/webhook` route (raw body is required).

---

## Validation sequence before stopping

Before marking a task complete, the agent must verify the following in order:

1. **TypeScript compiles without errors**
   ```bash
   npm run typecheck
   ```

2. **Lint passes**
   ```bash
   npm run lint
   ```

3. **Tests pass** (once a test framework is wired up)
   ```bash
   npm run test
   ```

4. **No new secrets committed**  
   Review `git diff --staged` and confirm no API keys, passwords, or tokens are present in committed files.

5. **No package-version regressions**  
   If `nodemailer` was touched, verify it remains at `≥ 8.0.5`.  
   If any new dependency was added, check the GitHub Advisory Database for known CVEs.

6. **Environment variables documented**  
   Any new env var must appear in `.env.example` with a `[REQUIRED]`, `[OPTIONAL]`, or `[3RD PARTY]` classification and a comment explaining how to obtain/generate it.

7. **Database schema changes migrated**  
   If `packages/db/prisma/schema.prisma` was modified, a migration must have been created:
   ```bash
   cd packages/db && npx prisma migrate dev --name <description>
   ```

8. **Local smoke-test** (when making API or auth changes)
   ```bash
   docker compose up -d
   npm run db:migrate
   npm run dev
   # verify GET http://localhost:3001/health returns { "status": "ok" }
   curl http://localhost:3001/health
   ```
