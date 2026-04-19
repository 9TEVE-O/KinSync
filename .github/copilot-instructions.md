# KinSync – Copilot Instructions

## What the repo does

KinSync is a **family coordination SaaS** application. It lets families manage members, share a family calendar, and subscribe to a paid plan. Key capabilities:

- **Passwordless auth** — magic-link email sign-in via JWT sessions
- **Family management** — create/join families, manage members and shared events
- **Billing** — Stripe-powered subscription checkout and billing portal
- **Email** — transactional emails (magic links, invites, welcome messages) via Nodemailer/SMTP

---

## Repo shape and main entry points

```
KinSync/
├── apps/
│   ├── web/          Next.js 15 frontend (React App Router)  → http://localhost:3000
│   └── api/          Express 4 API server                    → http://localhost:3001
├── packages/
│   ├── auth/         JWT session management, magic-link helpers  (entry: src/index.ts)
│   ├── billing/      Stripe checkout, portal, webhook handler    (entry: src/index.ts)
│   ├── db/           Prisma schema, migrations, seed             (entry: prisma/schema.prisma)
│   └── email/        Nodemailer transport, typed templates       (entry: src/index.ts)
├── docs/             Architecture, deployment, env-var reference
├── .env.example      Canonical environment variable reference
├── docker-compose.yml  Local Postgres 16 + MailHog
├── package.json      npm workspace root + Turbo scripts
└── turbo.json        Turbo task pipeline
```

**Dependency direction** (packages never import from apps; apps never import from each other):

```
apps/api   → packages/auth, billing, db, email
apps/web   → API via HTTP only (no direct package imports)
packages/auth    → packages/db
packages/billing → packages/db
packages/email   (standalone)
packages/db      (standalone)
```

---

## Exact build / test / lint / run commands

All commands are run from the **monorepo root** unless otherwise stated.

### Local development

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
npm install

# 2. Start backing services (Postgres :5432, MailHog SMTP :1025, UI :8025)
docker compose up -d

# 3. Apply migrations and seed demo data
npm run db:migrate
npm run db:seed

# 4. Start all apps in parallel (web :3000, api :3001)
npm run dev
```

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
