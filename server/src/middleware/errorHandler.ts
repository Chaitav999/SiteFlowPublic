import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Request validation failed", issues: err.issues });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof Error) {
    console.error("[siteflow] request failed", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }

  console.error("[siteflow] request failed with an unknown error");
  return res.status(500).json({ message: "Internal server error" });
}
