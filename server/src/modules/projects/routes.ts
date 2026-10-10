import { Router } from "express";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("projects")
      .select("id,name,highway,region")
      .order("name");
    throwOnSupabaseError(error);
    res.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await requestSupabase(req)
      .from("projects")
      .select("id,name,highway,region")
      .eq("id", req.params.id)
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) return res.status(404).json({ message: "Project not found" });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

export default router;
