# Getting Started

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | https://nodejs.org |
| npm | ≥ 10 | bundled with Node |
| Docker | ≥ 24 | https://docs.docker.com/get-docker/ |
| Docker Compose | ≥ 2.20 | bundled with Docker Desktop |

> **Stripe CLI** is optional. It is only needed to test webhook events locally.
> Install: https://stripe.com/docs/stripe-cli

---

## 1 – Clone and install

```bash
git clone https://github.com/9TEVE-O/KinSync.git
cd KinSync
npm install
```

---

## 2 – Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and set the two **required** values before proceeding:

| Variable | How to get it |
|----------|---------------|
| `DATABASE_URL` | Already set for local Docker (step 3). Leave as-is. |
| `JWT_SECRET` | Run `openssl rand -base64 32` and paste the output. |

All other variables have working local defaults. Stripe variables can be left
blank until you want to test billing.

---

## 3 – Start local services

```bash
docker compose up -d
```

This starts:

- **PostgreSQL** on `localhost:5432`
- **MailHog** on `localhost:1025` (SMTP) and `localhost:8025` (email preview UI)

---

## 4 – Run database migrations and seed

```bash
npm run db:migrate    # creates tables from the Prisma schema
npm run db:seed       # inserts demo data
```

Migrations are idempotent. Run them again after pulling new schema changes.

---

## 5 – Start the development servers

```bash
npm run dev
```

Turbo starts both apps in parallel:

| App | URL |
|-----|-----|
| Web (Next.js) | http://localhost:3000 |
| API (Express) | http://localhost:3001 |

---

## 6 – (Optional) Test billing locally

Install the Stripe CLI and forward webhooks:

```bash
stripe login
stripe listen --forward-to localhost:3001/api/billing/webhook
```

Copy the webhook signing secret printed by `stripe listen` and paste it into
`.env` as `STRIPE_WEBHOOK_SECRET`.

Fill in the remaining Stripe variables from your [Stripe dashboard](https://dashboard.stripe.com):

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
```

---

## First sign-in flow

1. Open http://localhost:3000/auth/login
2. Enter any email address
3. Open MailHog at http://localhost:8025 – your magic link will be there
4. Click the link to verify and sign in

---

## Stopping local services

```bash
docker compose down       # stop containers
docker compose down -v    # stop + delete postgres data
```
