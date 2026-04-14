import { Router } from "express";
import {
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  constructWebhookEvent,
  handleSubscriptionUpdated,
} from "@kinsync/billing";
import { requireAuth } from "../middleware/requireAuth.js";

export const billingRouter = Router();

// POST /api/billing/checkout – start a Stripe checkout
billingRouter.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const { priceId } = req.body as { priceId: string };
    const baseUrl = process.env["WEB_URL"] ?? "http://localhost:3000";

    const customerId = await getOrCreateCustomer(user.id, user.email);
    const url = await createCheckoutSession(
      customerId,
      priceId,
      `${baseUrl}/billing/success`,
      `${baseUrl}/billing/cancel`
    );

    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal – open Stripe billing portal
billingRouter.post("/portal", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const baseUrl = process.env["WEB_URL"] ?? "http://localhost:3000";

    const customerId = await getOrCreateCustomer(user.id, user.email);
    const url = await createBillingPortalSession(
      customerId,
      `${baseUrl}/billing`
    );

    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook – Stripe webhook (raw body required)
billingRouter.post("/webhook", async (req, res, next) => {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      res.status(400).json({ error: "Missing Stripe-Signature header" });
      return;
    }

    const event = constructWebhookEvent(
      req.body as Buffer,
      signature
    );

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionUpdated(event.data.object);
        break;
      default:
        // Unhandled events are silently ignored
        break;
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
