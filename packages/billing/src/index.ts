import Stripe from "stripe";
import { prisma, type Subscription } from "@kinsync/db";

// ──────────────────────────────────────────
// Stripe client (lazy-initialised)
// ──────────────────────────────────────────

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY env var is required");
  _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  return _stripe;
}

// ──────────────────────────────────────────
// Customer helpers
// ──────────────────────────────────────────

export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existing) return existing.stripeCustomerId;

  const customer = await getStripe().customers.create({
    email,
    metadata: { userId },
  });

  await prisma.subscription.create({
    data: {
      userId,
      stripeCustomerId: customer.id,
      status: "TRIALING",
    },
  });

  return customer.id;
}

// ──────────────────────────────────────────
// Checkout / portal
// ──────────────────────────────────────────

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) throw new Error("No checkout URL returned from Stripe");
  return session.url;
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

// ──────────────────────────────────────────
// Webhook handling
// ──────────────────────────────────────────

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET env var is required");
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const statusMap: Record<Stripe.Subscription.Status, Subscription["status"]> =
    {
      trialing: "TRIALING",
      active: "ACTIVE",
      past_due: "PAST_DUE",
      canceled: "CANCELED",
      unpaid: "UNPAID",
      incomplete: "INCOMPLETE",
      incomplete_expired: "INCOMPLETE",
      paused: "CANCELED",
    };

  const priceId =
    subscription.items.data[0]?.price.id ?? null;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: statusMap[subscription.status] ?? "INCOMPLETE",
      currentPeriodStart: new Date(
        subscription.current_period_start * 1000
      ),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}