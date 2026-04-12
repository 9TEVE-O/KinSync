import express from "express";
import helmet from "helmet";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { familyRouter } from "./routes/families.js";
import { billingRouter } from "./routes/billing.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// ──────────────────────────────────────────
// Security & parsing
// ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env["WEB_URL"] ?? "http://localhost:3000",
    credentials: true,
  })
);

// Raw body needed for Stripe webhook signature verification
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ──────────────────────────────────────────
// Health check
// ──────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────
// Routes
// ──────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/families", familyRouter);
app.use("/api/billing", billingRouter);

// ──────────────────────────────────────────
// Error handling
// ──────────────────────────────────────────
app.use(errorHandler);

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);
if (!Number.isFinite(PORT) || PORT <= 0) {
  console.error(`Invalid PORT: ${PORT}. Must be a finite positive integer.`);
  process.exit(1);
}
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

export default app;