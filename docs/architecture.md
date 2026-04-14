# Architecture

## Monorepo structure

```
KinSync/
├── apps/
│   ├── web/          Next.js 15 frontend (React, App Router)
│   └── api/          Express API server
├── packages/
│   ├── auth/         Session management, JWT, magic-link helpers
│   ├── billing/      Stripe customer, checkout, portal, webhook handler
│   ├── db/           Prisma schema, client, migrations, seeds
│   └── email/        Nodemailer transport, transactional templates
├── docs/             Documentation
├── .env.example      Environment variable reference
├── docker-compose.yml Local dev services (Postgres, MailHog)
├── package.json      Workspace root
└── turbo.json        Turbo task pipeline
```

## Design principles

### 1 – Explicit boundaries
Each package owns exactly one cross-cutting concern.  
No package imports from `apps/`.  
Apps import from packages, never from each other.

```
apps/web   ──► (no package imports yet – uses API via HTTP)
apps/api   ──► packages/auth, billing, db, email
packages/auth    ──► packages/db
packages/billing ──► packages/db
packages/email   (standalone)
packages/db      (standalone)
```

### 2 – Environment over configuration
Third-party credentials (Stripe, SMTP) are injected as environment variables.
Packages validate their required vars at call time and throw descriptive errors
rather than silently misconfiguring.

### 3 – Domain logic lives in packages
Business rules belong in `packages/`, not in route handlers.  
Route handlers translate HTTP ↔ domain; they do not contain logic.

### 4 – Single place to add a feature
Adding a new domain concept means:
1. Extend `packages/db/prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Add service helpers (auth, billing, etc.) to the relevant package
4. Add route handlers in `apps/api/src/routes/`
5. Add pages/components in `apps/web/src/app/`

No copy-pasting between routes; shared logic lives in packages.

## Data model overview

```
User ──► Session           (auth)
User ──► Subscription      (billing, one-to-one)
User ──► FamilyMember ──► Family
                           Family ──► FamilyEvent
User ──► AuditLog
```

## Auth flow

```
Browser            API               Email
  │                │                   │
  ├─POST /magic-link─►                 │
  │                ├─── send link ─────►
  │                │                   │
  │◄── 200 OK ─────┤                   │
  │                                    │
  ├─GET /verify?token=...──────────────►
  │                ▼                   │
  │           verify JWT               │
  │           create session           │
  │◄── { token } ──┤                   │
```

## Billing flow

```
Browser            API              Stripe
  │                │                  │
  ├─POST /checkout─►                  │
  │                ├─ create checkout ─►
  │◄── { url } ────┤                  │
  │                                   │
  ├─redirect to Stripe                │
  │◄─── redirect to /billing/success──│
  │                                   │
  Stripe ────── POST /billing/webhook ──► API
                                     update subscription
```
