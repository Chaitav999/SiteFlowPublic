import { Router } from "express";
import { z } from "zod";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

const syncOperationSchema = z.object({
  idempotencyKey: z.string().uuid(),
  entityType: z.enum(["Inspection", "Deficiency", "Photo", "Measurement", "Job", "Note"]),
  entityId: z.string().uuid(),
  label: z.string().trim().min(1).max(500),
  action: z.enum(["create", "update", "delete"]),
  status: z.enum(["Queued", "Uploading", "Synced", "Failed"]),
  error: z.string().max(2000).optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("sync_operations")
      .select(
        "id,entity_type,entity_id,label,action,created_at,status,error_message,idempotency_key",
      )
      .eq("user_id", req.user!.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    throwOnSupabaseError(error);
    res.json(
      (data ?? []).map((row) => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        label: row.label,
        action: row.action,
        createdAt: row.created_at,
        status: row.status,
        error: row.error_message,
        idempotencyKey: row.idempotency_key,
      })),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/operations", async (req, res, next) => {
  try {
    const operations = z.array(syncOperationSchema).min(1).max(50).parse(req.body);
    const rows = operations.map((operation) => ({
      entity_type: operation.entityType,
      entity_id: operation.entityId,
      label: operation.label,
      action: operation.action,
      status: operation.status,
      error_message: operation.error ?? null,
      idempotency_key: operation.idempotencyKey,
      user_id: req.user!.userId,
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await requestSupabase(req)
      .from("sync_operations")
      .upsert(rows, { onConflict: "idempotency_key" })
      .select(
        "id,entity_type,entity_id,label,action,created_at,status,error_message,idempotency_key",
      );
    throwOnSupabaseError(error);
    res.status(200).json(data ?? []);
  } catch (error) {
    next(error);
  }
});

export default router;
