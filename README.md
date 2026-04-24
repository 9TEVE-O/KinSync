# KinSync

**Your family, in sync.**

KinSync is an original family-coordination SaaS scaffold built around clean module boundaries, deterministic local setup, and a practical deployment path. It is designed as a production-minded application base: clear frontend and API separation, isolated auth/billing/email/database packages, documented environment variables, and a local development flow that can be understood quickly by future contributors.

## What it demonstrates

- Full-stack product scaffolding with Next.js and an API service
- Isolated packages for auth, billing, database, and email concerns
- Deterministic local setup using Docker, Prisma, and documented environment files
- Deployment-aware architecture rather than a demo-only prototype

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

**Minimum prerequisites:** Node >= 20, npm >= 10, Docker >= 24.

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

---

## Audit rubric

| Criterion | Status |
|-----------|--------|
| Setup is deterministic | Pass: 5 steps, no implied knowledge |
| Repo boundaries are clear | Pass: auth, billing, db, and email isolated in packages |
| Deploy path is explicit | Pass: see [docs/deployment.md](docs/deployment.md) |
| Third-party integrations are modular | Pass: Stripe in `packages/billing`, SMTP in `packages/email` |
| Domain logic can stay isolated | Pass: route handlers are thin; logic lives in packages |
