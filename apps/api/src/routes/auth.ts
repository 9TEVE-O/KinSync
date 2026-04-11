import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { findOrCreateUser, createSession, deleteSession, markEmailVerified, signToken } from "@kinsync/auth";
import { sendMagicLink } from "@kinsync/email";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

// Limit magic-link requests to 5 per 15 minutes per IP
const magicLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please try again later." },
});

const SendMagicLinkSchema = z.object({
  email: z.string().email(),
});

// POST /api/auth/magic-link – send a sign-in link
authRouter.post("/magic-link", magicLinkLimiter, async (req, res, next) => {
  try {
    const { email } = SendMagicLinkSchema.parse(req.body);
    const user = await findOrCreateUser(email);

    // In a real deployment this token is short-lived and single-use.
    // Here we issue a JWT and embed it in the link.
    const token = await signToken(user.id);
    const baseUrl = process.env["WEB_URL"] ?? "http://localhost:3000";
    const magicLink = `${baseUrl}/auth/verify?token=${token}`;

    await sendMagicLink(email, magicLink);

    res.json({ message: "Magic link sent" });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/verify?token=... – exchange token for a session
authRouter.get("/verify", async (req, res, next) => {
  try {
    const token = z.string().parse(req.query["token"]);
    const { verifyToken } = await import("@kinsync/auth");
    const payload = await verifyToken(token);

    if (!payload) {
      res.status(400).json({ error: "Invalid or expired token" });
      return;
    }

    await markEmailVerified(payload.userId);
    const sessionToken = await createSession(payload.userId);

    res.json({ token: sessionToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] ?? "";
    const token = authHeader.slice(7);
    await deleteSession(token);
    res.json({ message: "Signed out" });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
