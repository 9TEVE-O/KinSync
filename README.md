# KinSync

**Your family, in sync.**

KinSync is a family-coordination SaaS scaffold with clean module boundaries,
deterministic local setup, and an explicit deployment story.

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
# → Web:  http://localhost:3000
# → API:  http://localhost:3001
# → Mail: http://localhost:8025
```

**Minimum prerequisites:** Node ≥ 20, npm ≥ 10, Docker ≥ 24.

---

## Repo structure

```
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
| [Architecture](docs/architecture.md) | Module boundaries, data model, auth & billing flows |
| [Environment Variables](docs/environment-variables.md) | Every variable explained |
| [Deployment](docs/deployment.md) | Railway, Render, Fly.io, Docker; migrations; webhooks |

---

## Audit rubric

| Criterion | Status |
|-----------|--------|
| Setup is deterministic | ✅ 5 steps, no implied knowledge |
| Repo boundaries are clear | ✅ auth / billing / db / email isolated in packages |
| Deploy path is explicit | ✅ see [docs/deployment.md](docs/deployment.md) |
| Third-party integrations are modular | ✅ Stripe in `packages/billing`, SMTP in `packages/email` |
| Domain logic can stay isolated | ✅ route handlers are thin; logic lives in packages |
