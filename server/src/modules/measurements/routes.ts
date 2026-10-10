import { Router } from "express";
import { z } from "zod";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

const measurementSchema = z.object({
  id: z.string().uuid().optional(),
  workOrderId: z.string().uuid(),
  inspectionId: z.string().uuid().nullish(),
  kind: z.string().trim().min(1),
  value: z.number().finite(),
  unit: z.string().trim().min(1),
  notes: z.string().trim().max(4000).optional(),
  recordedAt: z.string().datetime().optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().nonnegative(),
      capturedAt: z.string().datetime(),
    })
    .optional(),
});

function mapMeasurement(row: Record<string, unknown>) {
  const profile =
    typeof row.profile === "object" && row.profile !== null
      ? (row.profile as Record<string, unknown>)
      : {};
  const hasLocation = row.location_lat !== null && row.location_lng !== null;
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    inspectionId: row.inspection_id,
    kind: row.kind,
    value: Number(row.value),
    unit: row.unit,
    recordedBy: profile.name ?? row.recorded_by,
    recordedAt: row.recorded_at,
    notes: row.notes,
    location: hasLocation
      ? {
          lat: row.location_lat,
          lng: row.location_lng,
          accuracy: row.location_accuracy,
          capturedAt: row.captured_at,
        }
      : undefined,
    syncStatus: row.sync_status === "Synced" ? "synced" : "pending",
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("measurements")
      .select("*,profile:profiles(name)")
      .order("recorded_at", { ascending: false });
    throwOnSupabaseError(error);
    res.json((data ?? []).map(mapMeasurement));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = measurementSchema.parse(req.body);
    const timestamp = payload.recordedAt ?? new Date().toISOString();
    const client = requestSupabase(req);
    const { data: inserted, error } = await client
      .from("measurements")
      .upsert({
        ...(payload.id ? { id: payload.id } : {}),
        work_order_id: payload.workOrderId,
        inspection_id: payload.inspectionId ?? null,
        kind: payload.kind,
        value: payload.value,
        unit: payload.unit,
        recorded_by: req.user!.userId,
        recorded_at: timestamp,
        notes: payload.notes ?? null,
        location_lat: payload.location?.lat ?? null,
        location_lng: payload.location?.lng ?? null,
        location_accuracy: payload.location ? Math.round(payload.location.accuracy) : null,
        captured_at: payload.location?.capturedAt ?? null,
        sync_status: "Synced",
      })
      .select("*,profile:profiles(name)")
      .maybeSingle();
    throwOnSupabaseError(error);
    const { data, error: lookupError } = inserted
      ? { data: inserted, error: null }
      : await client
          .from("measurements")
          .select("*,profile:profiles(name)")
          .eq("id", payload.id ?? "")
          .single();
    throwOnSupabaseError(lookupError);
    if (!data) throw new Error("Supabase did not return the saved measurement");
    res.status(201).json(mapMeasurement(data));
  } catch (error) {
    next(error);
  }
});

export default router;
