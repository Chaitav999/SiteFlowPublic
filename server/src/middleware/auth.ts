import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseClient } from "../config/supabase.js";
import { AppError } from "../utils/errors.js";

export interface RequestUser {
  role: string;
  userId: string;
  email?: string;
  name?: string;
  initials?: string;
  title?: string;
  crewId?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: RequestUser;
    supabase?: SupabaseClient;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const supabase = createSupabaseClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid or expired access token" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,name,email,initials,title,crew_id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return res.status(403).json({ message: "Authenticated account has no siteFlow profile" });
    }

    req.supabase = supabase;
    req.user = toRequestUser(data.user, profile);
    return next();
  } catch (error) {
    return next(error instanceof Error ? error : new AppError("Authentication failed", 500));
  }
}

function toRequestUser(
  user: User,
  profile: {
    role: string;
    name: string;
    email: string;
    initials: string;
    title: string;
    crew_id: string | null;
  },
): RequestUser {
  return {
    userId: user.id,
    email: user.email,
    role: profile.role,
    name: profile.name,
    initials: profile.initials,
    title: profile.title,
    crewId: profile.crew_id ?? undefined,
  };
}
