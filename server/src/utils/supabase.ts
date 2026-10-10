import type { Request } from "express";
import { AppError } from "./errors.js";

export function requestSupabase(req: Request) {
  if (!req.supabase) throw new AppError("Authenticated Supabase client unavailable", 500);
  return req.supabase;
}

export function throwOnSupabaseError(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "PGRST116") throw new AppError("Record not found", 404);
  if (error.code === "23505")
    throw new AppError("A record with the same unique value already exists", 409);
  if (error.code === "23503")
    throw new AppError("A related record does not exist or is still in use", 409);
  if (error.code === "42501") throw new AppError("Insufficient permissions", 403);
  console.error("[siteflow] Supabase operation failed", error.code ?? "unknown", error.message);
  throw new AppError("Database operation failed", 500);
}
