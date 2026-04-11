# Environment Variables

All variables are defined in `.env.example` at the repository root.
Copy that file to `.env` before running the app.

---

## Required

| Variable | Used by | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `packages/db` | PostgreSQL connection string |
| `JWT_SECRET` | `packages/auth` | ≥ 32-char secret for signing JWTs |

---

## Optional (have defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Node environment |
| `PORT` | `3001` | API server port |
| `WEB_URL` | `http://localhost:3000` | Frontend URL (used in magic links) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API URL (used in frontend) |
| `SMTP_HOST` | – | SMTP host. Use `localhost` with MailHog. |
| `SMTP_PORT` | `587` | SMTP port. Use `1025` with MailHog. |
| `SMTP_USER` | – | SMTP username (not required for MailHog) |
| `SMTP_PASS` | – | SMTP password (not required for MailHog) |
| `EMAIL_FROM` | `KinSync <noreply@kinsync.app>` | From address on outgoing emails |

---

## Third-party (require external accounts)

| Variable | Service | Where to find it |
|----------|---------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe | https://dashboard.stripe.com/apikeys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Stripe | https://dashboard.stripe.com/webhooks (or `stripe listen` output) |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | Stripe | https://dashboard.stripe.com/products |

---

## Adding new variables

1. Add the variable to `.env.example` with a comment explaining its purpose.
2. Mark it as `[REQUIRED]`, `[OPTIONAL]`, or `[3RD PARTY]`.
3. Validate it at call-time in the consuming package (throw a descriptive error
   if it is missing rather than silently misconfiguring).
4. Do **not** add defaults for secrets – require them explicitly.
