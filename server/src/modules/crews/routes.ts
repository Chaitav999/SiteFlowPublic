import { Router } from "express";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

function mapCrew(row: Record<string, unknown>) {
  const memberRows = Array.isArray(row.members) ? (row.members as Record<string, unknown>[]) : [];
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    status: row.status,
    lead: row.lead,
    members: memberRows.map((member) => {
      const profile =
        typeof member.profile === "object" && member.profile !== null
          ? (member.profile as Record<string, unknown>)
          : {};
      return { userId: member.user_id, name: profile.name, position: member.position };
    }),
    currentWorkOrderId: row.current_work_order_id,
    completedJobs: row.completed_jobs,
    hoursThisWeek: Number(row.hours_this_week),
    location: { lat: row.location_lat, lng: row.location_lng },
    locationLabel: row.location_label,
    vehicle: row.vehicle,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("crews")
      .select("*,members:crew_members(user_id,position,profile:profiles(name))")
      .order("name");
    throwOnSupabaseError(error);
    res.json((data ?? []).map(mapCrew));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("crews")
      .select("*,members:crew_members(user_id,position,profile:profiles(name))")
      .eq("id", req.params.id)
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) return res.status(404).json({ message: "Crew not found" });
    return res.json(mapCrew(data));
  } catch (error) {
    return next(error);
  }
});

export default router;
