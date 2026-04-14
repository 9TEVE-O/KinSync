import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
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