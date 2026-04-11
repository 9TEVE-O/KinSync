import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof Error) {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  } else {
    res.status(500).json({ error: "An unexpected error occurred" });
  }
}
