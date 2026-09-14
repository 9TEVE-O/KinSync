import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Invalid client input is a 400, not a 500 — surface which fields failed.
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: err.issues });
    return;
  }

  // Always log the full error for debugging
  if (err instanceof Error) {
    console.error(err.stack);
  } else {
    console.error(err);
  }

  // Send generic error to client (include details only in development)
  if (process.env["NODE_ENV"] === "development" && err instanceof Error) {
    res.status(500).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}
