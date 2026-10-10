import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../utils/errors.js";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

const inspectionPatchSchema = z.object({
  answers: z.record(z.string(), z.string()).optional(),
  notes: z.string().optional(),
  measurements: z.record(z.string(), z.string()).optional(),
  locationEvidence: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().nonnegative(),
      capturedAt: z.string().datetime(),
    })
    .optional(),
});

function evaluateInspection(answers: Record<string, string>) {
  const badValues = ["Poor", "Critical"];
  if (Object.values(answers).some((value) => badValues.includes(value))) return "Failed" as const;
  if (["damage", "hazard", "blocked"].some((key) => answers[key] === "Yes"))
    return "Failed" as const;
  return "Passed" as const;
}

function mapInspection(row: Record<string, unknown>) {
  const template =
    typeof row.template === "object" && row.template !== null
      ? (row.template as Record<string, unknown>)
      : undefined;
  return {
    id: row.id,
    title: row.title,
    template: template?.slug,
    workOrderId: row.work_order_id,
    locationLabel: row.location_label,
    inspector: row.inspector,
    status: row.status,
    scheduledFor: row.scheduled_for,
    answers: row.answers,
    notes: row.notes,
    measurements: row.measurements,
    locationEvidence:
      row.location_lat == null || row.location_lng == null
        ? undefined
        : {
            lat: row.location_lat,
            lng: row.location_lng,
            accuracy: row.location_accuracy,
            capturedAt: row.captured_at,
          },
    submittedAt: row.submitted_at,
    syncStatus: row.sync_status === "Synced" ? "synced" : "pending",
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("inspections")
      .select("*,template:inspection_templates(slug)")
      .order("scheduled_for", { ascending: false });
    throwOnSupabaseError(error);
    res.json((data ?? []).map(mapInspection));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const payload = inspectionPatchSchema.parse(req.body);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.answers !== undefined) patch.answers = payload.answers;
    if (payload.notes !== undefined) patch.notes = payload.notes;
    if (payload.measurements !== undefined) patch.measurements = payload.measurements;
    if (payload.locationEvidence !== undefined) {
      patch.location_lat = payload.locationEvidence.lat;
      patch.location_lng = payload.locationEvidence.lng;
      patch.location_accuracy = payload.locationEvidence.accuracy;
      patch.captured_at = payload.locationEvidence.capturedAt;
    }

    const { data, error } = await requestSupabase(req)
      .from("inspections")
      .update(patch)
      .eq("id", req.params.id)
      .select("*,template:inspection_templates(slug)")
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) throw notFound("Inspection");
    res.json(mapInspection(data));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/submit", async (req, res, next) => {
  try {
    const payload = inspectionPatchSchema.parse(req.body);
    const client = requestSupabase(req);
    const { data: current, error: readError } = await client
      .from("inspections")
      .select("answers")
      .eq("id", req.params.id)
      .maybeSingle();
    throwOnSupabaseError(readError);
    if (!current) throw notFound("Inspection");

    const answers = payload.answers ?? current.answers;
    const patch: Record<string, unknown> = {
      answers,
      status: evaluateInspection(answers),
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (payload.notes !== undefined) patch.notes = payload.notes;
    if (payload.measurements !== undefined) patch.measurements = payload.measurements;
    if (payload.locationEvidence !== undefined) {
      patch.location_lat = payload.locationEvidence.lat;
      patch.location_lng = payload.locationEvidence.lng;
      patch.location_accuracy = payload.locationEvidence.accuracy;
      patch.captured_at = payload.locationEvidence.capturedAt;
    }

    const { data, error } = await client
      .from("inspections")
      .update(patch)
      .eq("id", req.params.id)
      .select("*,template:inspection_templates(slug)")
      .single();
    throwOnSupabaseError(error);
    res.json(mapInspection(data));
  } catch (error) {
    next(error);
  }
});

export default router;
