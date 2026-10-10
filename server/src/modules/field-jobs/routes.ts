import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../utils/errors.js";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

function mapFieldJob(row: Record<string, unknown>) {
  const assignments = Array.isArray(row.assignments) ? row.assignments : [];
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    title: row.title,
    scheduledAt: row.scheduled_at,
    crewId: row.crew_id,
    status: row.status,
    instructions: row.instructions,
    safetyNotes: row.safety_notes,
    inspectionId: row.inspection_id,
    assignedUserIds: assignments.flatMap((assignment) => {
      if (typeof assignment !== "object" || assignment === null || !("user_id" in assignment)) {
        return [];
      }
      return typeof assignment.user_id === "string" ? [assignment.user_id] : [];
    }),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    syncStatus: row.sync_status === "Synced" ? "synced" : "pending",
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("field_jobs")
      .select("*, assignments:job_assignments(user_id)")
      .order("scheduled_at", { ascending: false });
    throwOnSupabaseError(error);
    res.json((data ?? []).map(mapFieldJob));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const status = z
      .enum(["Assigned", "In Progress", "Paused", "Completed"])
      .parse(req.body.status);
    const client = requestSupabase(req);
    const { data, error } = await client.rpc("transition_field_job", {
      target_job_id: req.params.id,
      next_status: status,
    });
    throwOnSupabaseError(error);
    const job = Array.isArray(data) ? data[0] : data;
    if (!job) throw notFound("Field job");
    res.json(mapFieldJob(job));
  } catch (error) {
    next(error);
  }
});

export default router;
