import { Router } from "express";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

function mapNotification(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    at: row.created_at,
    read: row.read,
    tone: row.tone,
    link: row.link_kind ? { kind: row.link_kind, id: row.link_id } : undefined,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    throwOnSupabaseError(error);
    res.json((data ?? []).map(mapNotification));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) return res.status(404).json({ message: "Notification not found" });
    return res.json(mapNotification(data));
  } catch (error) {
    return next(error);
  }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    const { error } = await requestSupabase(req)
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("read", false);
    throwOnSupabaseError(error);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
