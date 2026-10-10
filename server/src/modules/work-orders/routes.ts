import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../utils/errors.js";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

const workOrderSchema = z.object({
  title: z.string().trim().min(1),
  type: z.string().trim().min(1),
  projectId: z.string().uuid(),
  highway: z.string().trim().min(1),
  km: z.number().nonnegative(),
  locationLabel: z.string().trim().min(1),
  location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  crewId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  supervisor: z.string().uuid().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  status: z
    .enum(["Assigned", "In Progress", "Awaiting Review", "Completed", "Blocked"])
    .default("Assigned"),
  dueDate: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  description: z.string().trim().min(1),
  checklist: z
    .array(z.object({ id: z.string(), label: z.string(), done: z.boolean() }))
    .default([]),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        sizeKb: z.number().nonnegative(),
        kind: z.enum(["pdf", "dwg", "xlsx", "doc"]),
      }),
    )
    .default([]),
});

function mapWorkOrder(row: Record<string, unknown>) {
  return {
    id: row.id,
    workOrderNumber: row.work_order_number,
    title: row.title,
    type: row.type,
    projectId: row.project_id,
    highway: row.highway,
    km: Number(row.km),
    locationLabel: row.location_label,
    location: { lat: row.location_lat, lng: row.location_lng },
    crewId: row.crew_id,
    assignedTo: row.assigned_to,
    supervisor: row.supervisor,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    description: row.description,
    checklist: row.checklist,
    attachments: row.attachments,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false });
    throwOnSupabaseError(error);
    res.json((data ?? []).map(mapWorkOrder));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("work_orders")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) throw notFound("Work order");
    res.json(mapWorkOrder(data));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("supervisor", "admin"), async (req, res, next) => {
  try {
    const payload = workOrderSchema.parse(req.body);
    const client = requestSupabase(req);
    const workOrderNumber = `WO-${Date.now()}`;
    const { data, error } = await client
      .from("work_orders")
      .insert({
        work_order_number: workOrderNumber,
        title: payload.title,
        type: payload.type,
        project_id: payload.projectId,
        highway: payload.highway,
        km: payload.km,
        location_label: payload.locationLabel,
        location_lat: payload.location.lat,
        location_lng: payload.location.lng,
        crew_id: payload.crewId ?? null,
        assigned_to: payload.assignedTo ?? null,
        supervisor: payload.supervisor ?? null,
        priority: payload.priority,
        status: payload.status,
        due_date: payload.dueDate ?? null,
        scheduled_at: payload.scheduledAt ?? null,
        description: payload.description,
        checklist: payload.checklist,
        attachments: payload.attachments,
      })
      .select("*")
      .single();
    throwOnSupabaseError(error);
    res.status(201).json(mapWorkOrder(data));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireRole("supervisor", "admin"), async (req, res, next) => {
  try {
    const status = z
      .enum(["Assigned", "In Progress", "Awaiting Review", "Completed", "Blocked"])
      .parse(req.body.status);
    const { data, error } = await requestSupabase(req)
      .from("work_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) throw notFound("Work order");
    res.json(mapWorkOrder(data));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/checklist/:itemId", async (req, res, next) => {
  try {
    const done = z.boolean().parse(req.body.done);
    const client = requestSupabase(req);
    const { data: updatedChecklist, error } = await client.rpc("update_work_order_checklist", {
      target_work_order_id: req.params.id,
      target_item_id: req.params.itemId,
      item_done: done,
    });
    throwOnSupabaseError(error);
    if (!updatedChecklist) throw notFound("Work order or checklist item");
    res.json({ id: req.params.id, checklist: updatedChecklist });
  } catch (error) {
    next(error);
  }
});

export default router;
