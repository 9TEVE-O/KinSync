# Deployment

## Supported targets

| Target | Guide |
|--------|-------|
| Railway | [railway.app](https://railway.app) – recommended for both apps + Postgres |
| Render | [render.com](https://render.com) |
| Fly.io | [fly.io](https://fly.io) |
| Self-hosted Docker | See below |

---

## Environment separation

| Environment | Database | Stripe | Email |
|-------------|----------|--------|-------|
| Development | Local Postgres (Docker) | Test keys | MailHog |
| Preview (PR) | Ephemeral (platform-managed) | Test keys | Logs only |
| Production | Managed Postgres | Live keys | Production SMTP |

> Set `NODE_ENV=production` in all non-development environments.

---

## Secrets handling

- **Never commit `.env`** – it is in `.gitignore`.
- Store secrets in your platform's secrets manager (Railway Variables,
  Render Environment, GitHub Actions Secrets, etc.).
- The minimum required production secrets are:
  ```
  DATABASE_URL
  JWT_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  SMTP_HOST (+ credentials)
  ```

---

## Database migration flow

Migrations run automatically on deploy via the `db:migrate:deploy` script.
Add it as a **pre-deploy command** in your platform:

```bash
cd packages/db && npx prisma migrate deploy
```

This command:
- Is idempotent (safe to run on every deploy)
- Does **not** reset data
- Fails fast if the database is unreachable (preventing a bad deploy)

### Rolling back a migration

Prisma does not support automatic down-migrations.  
To roll back:
1. Create a new migration that undoes the schema change.
2. Deploy the new migration.

---

## Railway deployment (recommended)

### API

1. Create a new Railway project.
2. Add a **PostgreSQL** service – Railway sets `DATABASE_URL` automatically.
3. Add a new **Service** pointing to the `apps/api` directory.
4. Set the start command: `node dist/index.js`
5. Set the build command: `npm install && npm run build`
6. Add all required environment variables.

### Web

1. Add another Railway service pointing to `apps/web`.
2. Set the build command: `npm install && npm run build`
3. Set the start command: `npm start`
4. Set `NEXT_PUBLIC_API_URL` to the Railway-assigned URL of the API service.

### Pre-deploy hook

In Railway → Settings → Deploy → Pre-deploy command:

```bash
cd packages/db && npx prisma migrate deploy
```

---

## Docker self-hosted

```bash
# Build API image
docker build -f apps/api/Dockerfile -t kinsync-api .

# Build web image
docker build -f apps/web/Dockerfile -t kinsync-web .

# Run with a managed Postgres
docker run -d \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e STRIPE_SECRET_KEY="..." \
  -p 3001:3001 \
  kinsync-api

docker run -d \
  -e NEXT_PUBLIC_API_URL="https://api.yourdomain.com" \
  -p 3000:3000 \
  kinsync-web
```

---

## Stripe webhooks in production

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://api.yourdomain.com/api/billing/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the signing secret and set it as `STRIPE_WEBHOOK_SECRET`.

---

## Monitoring and error reporting

The API logs errors to stdout. Connect to a log aggregator of your choice
(Datadog, Logtail, Railway Logs, etc.).

For error tracking, add [Sentry](https://sentry.io) by installing
`@sentry/node` in `apps/api` and calling `Sentry.init()` before the Express
app starts.

---

## Rollback story

1. Railway / Render support **instant redeploy** to any previous deployment.
2. For database-breaking changes, deploy a new forward-migration instead of
   rolling back the application (see *Rolling back a migration* above).
3. Keep at least **one day of automated Postgres backups** enabled in your
   platform – all managed providers offer this.
