import { Router } from "express";
import { z } from "zod";
import { createSupabaseClient } from "../../config/supabase.js";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/signup", async (req, res, next) => {
  try {
    const credentials = credentialsSchema
      .extend({ name: z.string().trim().min(1).max(120) })
      .parse(req.body);
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: { data: { name: credentials.name } },
    });

    if (error) throw new AppError(error.message, 400);
    res.status(201).json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session,
      requiresEmailConfirmation: !data.session,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const credentials = credentialsSchema.parse(req.body);
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (error || !data.session) throw new AppError("Invalid email or password", 401);
    res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
