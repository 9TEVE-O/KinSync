# KinSync

**Your family, in sync.**

## What this is

KinSync is a TypeScript monorepo **scaffold** for a family-coordination SaaS: a
Next.js web app and an Express API over isolated auth, billing, email, and
database packages. It's a foundation to build family features on — the
infrastructure is wired up; most product features are not built yet.

## What it coordinates

- **Families** — create a family; members hold `OWNER` / `ADMIN` / `MEMBER` roles
- **Shared events** — calendar events scoped to a family (data model in place)
- **Passwordless sign-in** — magic-link email auth, 7-day JWT sessions
- **Billing** — Stripe checkout, customer portal, and subscription webhooks
- **Transactional email** — magic links via SMTP (MailHog for local dev)

## What it is not

Not a finished product. Family endpoints today cover only create / list / view —
no editing, membership management, or event routes yet — and there is no
automated test coverage for `apps/` or `packages/` beyond a LICENSE check.

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/9TEVE-O/KinSync.git
cd KinSync
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET (run: openssl rand -base64 32)

# 3. Start local services (Postgres + MailHog)
docker compose up -d

# 4. Run migrations and seed
npm run db:migrate
npm run db:seed

# 5. Start development servers
npm run dev
# Web:  http://localhost:3000
# API:  http://localhost:3001
# Mail: http://localhost:8025
```

**Minimum prerequisites:** Node >= 20.19, npm >= 10, Docker >= 24.

---

## Repo structure

```text
KinSync/
├── apps/
│   ├── web/          Next.js 15 frontend
│   └── api/          Express API
├── packages/
│   ├── auth/         JWT sessions, magic-link helpers
│   ├── billing/      Stripe checkout, portal, webhook handler
│   ├── db/           Prisma schema, client, migrations, seeds
│   └── email/        Nodemailer transport, transactional templates
├── docs/             Architecture, deployment, env-var reference
├── .env.example      All environment variables documented
└── docker-compose.yml  Local Postgres + MailHog
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Getting Started](docs/getting-started.md) | Full local setup walkthrough |
| [Architecture](docs/architecture.md) | Module boundaries, data model, auth and billing flows |
| [Environment Variables](docs/environment-variables.md) | Every variable explained |
| [Deployment](docs/deployment.md) | Railway, Render, Fly.io, Docker, migrations, and webhooks |

