import { Router } from "express";
import { z } from "zod";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const payload = z
      .object({
        id: z.string().uuid().optional(),
        workOrderId: z.string().uuid(),
        text: z.string().trim().min(1).max(4000),
      })
      .parse(req.body);
    const client = requestSupabase(req);
    const { data: inserted, error } = await client
      .from("audit_events")
      .upsert(
        {
          ...(payload.id ? { id: payload.id } : {}),
          actor_id: req.user!.userId,
          event_type: "work_order.note",
          message: payload.text,
          work_order_id: payload.workOrderId,
          metadata: { note: payload.text },
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id,event_type,message,work_order_id,created_at")
      .maybeSingle();
    throwOnSupabaseError(error);
    const { data, error: lookupError } = inserted
      ? { data: inserted, error: null }
      : await client
          .from("audit_events")
          .select("id,event_type,message,work_order_id,created_at")
          .eq("id", payload.id ?? "")
          .single();
    throwOnSupabaseError(lookupError);
    if (!data) throw new Error("Supabase did not return the saved note");
    res.status(201).json({
      id: data.id,
      message: data.message,
      workOrderId: data.work_order_id,
      at: data.created_at,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
