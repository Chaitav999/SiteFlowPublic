import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/requireRole.js";
import { notFound } from "../../utils/errors.js";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

const deficiencySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  highway: z.string().trim().min(1),
  locationLabel: z.string().trim().min(1),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative(),
    capturedAt: z.string().datetime(),
  }),
  workOrderId: z.string().uuid().nullish(),
  inspectionId: z.string().uuid().nullish(),
});

function mapDeficiency(row: Record<string, unknown>) {
  return {
    id: row.id,
    deficiencyNumber: row.deficiency_number,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    highway: row.highway,
    locationLabel: row.location_label,
    location: {
      lat: row.location_lat,
      lng: row.location_lng,
      accuracy: row.location_accuracy,
      capturedAt: row.reported_at,
    },
    reportedBy: row.reported_by,
    reportedAt: row.reported_at,
    workOrderId: row.work_order_id,
    inspectionId: row.inspection_id,
    assignedCrewId: row.assigned_crew_id,
    dueDate: row.due_date,
    resolutionNotes: row.resolution_notes,
    history: row.history,
    syncStatus: row.sync_status === "Synced" ? "synced" : "pending",
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("deficiencies")
      .select("*")
      .order("reported_at", { ascending: false });
    throwOnSupabaseError(error);
    res.json((data ?? []).map(mapDeficiency));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = deficiencySchema.parse(req.body);
    const client = requestSupabase(req);
    const timestamp = new Date().toISOString();
    const deficiencyNumber = `DEF-${Date.now()}`;
    const { data: inserted, error } = await client
      .from("deficiencies")
      .upsert(
        {
          ...(payload.id ? { id: payload.id } : {}),
          deficiency_number: deficiencyNumber,
          title: payload.title,
          description: payload.description,
          category: payload.category,
          severity: payload.severity,
          status: "Open",
          highway: payload.highway,
          location_label: payload.locationLabel,
          location_lat: payload.location.lat,
          location_lng: payload.location.lng,
          location_accuracy: payload.location.accuracy,
          reported_by: req.user!.userId,
          reported_at: timestamp,
          work_order_id: payload.workOrderId ?? null,
          inspection_id: payload.inspectionId ?? null,
          history: [{ status: "Open", at: timestamp, by: req.user!.name ?? req.user!.userId }],
          sync_status: "Synced",
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("*")
      .maybeSingle();
    throwOnSupabaseError(error);
    const { data: existing, error: lookupError } = inserted
      ? { data: inserted, error: null }
      : await client
          .from("deficiencies")
          .select("*")
          .eq("id", payload.id ?? "")
          .maybeSingle();
    throwOnSupabaseError(lookupError);
    const data = existing;
    if (!data) throw new Error("Supabase did not return the saved deficiency");

    const { error: auditError } = await client.from("audit_events").upsert(
      {
        id: data.id,
        actor_id: req.user!.userId,
        event_type: "deficiency.created",
        message: `Reported ${payload.title}`,
        work_order_id: payload.workOrderId ?? null,
        metadata: { deficiency_id: data.id, severity: payload.severity },
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    throwOnSupabaseError(auditError);

    if (payload.severity === "High" || payload.severity === "Critical") {
      const { error: notificationError } = await client.from("notifications").upsert(
        {
          id: data.id,
          title: `${payload.severity} deficiency reported`,
          body: `${deficiencyNumber} ${payload.title} — ${payload.locationLabel}`,
          tone: payload.severity === "Critical" ? "critical" : "warning",
          link_kind: "deficiency",
          link_id: data.id,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      throwOnSupabaseError(notificationError);
    }

    res.status(201).json(mapDeficiency(data));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("supervisor", "admin"), async (req, res, next) => {
  try {
    const payload = z
      .object({
        assignedCrewId: z.string().uuid().nullish(),
        dueDate: z.string().datetime().nullable().optional(),
        resolutionNotes: z.string().trim().max(4000).nullable().optional(),
      })
      .strict()
      .parse(req.body);
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.assignedCrewId !== undefined) updates.assigned_crew_id = payload.assignedCrewId;
    if (payload.dueDate !== undefined) updates.due_date = payload.dueDate;
    if (payload.resolutionNotes !== undefined) updates.resolution_notes = payload.resolutionNotes;
    const { data, error } = await requestSupabase(req)
      .from("deficiencies")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) throw notFound("Deficiency");
    res.json(mapDeficiency(data));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireRole("supervisor", "admin"), async (req, res, next) => {
  try {
    const status = z
      .enum(["Open", "Assigned", "In Progress", "Resolved", "Verified"])
      .parse(req.body.status);
    const note = z.string().trim().max(4000).optional().parse(req.body.note);
    const client = requestSupabase(req);
    const { data: current, error: readError } = await client
      .from("deficiencies")
      .select("history")
      .eq("id", req.params.id)
      .maybeSingle();
    throwOnSupabaseError(readError);
    if (!current) throw notFound("Deficiency");

    const timestamp = new Date().toISOString();
    const actor = req.user!.name ?? req.user!.userId;
    const history = z
      .array(
        z.object({
          status: z.enum(["Open", "Assigned", "In Progress", "Resolved", "Verified"]),
          at: z.string(),
          by: z.string(),
          note: z.string().optional(),
        }),
      )
      .parse(current.history);
    const lastEntry = history.at(-1);
    const alreadyRecorded =
      lastEntry?.status === status && lastEntry.by === actor && lastEntry.note === note;
    const updates: Record<string, unknown> = {
      status,
      history: alreadyRecorded ? history : [...history, { status, at: timestamp, by: actor, note }],
      updated_at: timestamp,
    };
    if (status === "Resolved") {
      updates.resolution_notes = note ?? null;
      updates.resolved_at = timestamp;
    }
    if (status === "Verified") updates.verified_at = timestamp;

    const { data, error } = await client
      .from("deficiencies")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) throw notFound("Deficiency");
    res.json(mapDeficiency(data));
  } catch (error) {
    next(error);
  }
});

export default router;
