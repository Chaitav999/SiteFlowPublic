import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { AppError, notFound } from "../../utils/errors.js";
import { requestSupabase, throwOnSupabaseError } from "../../utils/supabase.js";

const router = Router();
const storageBucket = "photo-evidence";

const photoSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().min(1),
  caption: z.string().trim().max(500).default(""),
  category: z.enum(["Before", "During", "After", "Deficiency", "Safety", "Equipment"]),
  workOrderId: z.string().uuid(),
  deficiencyId: z.string().uuid().optional(),
  inspectionId: z.string().uuid().optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative(),
    capturedAt: z.string().datetime(),
  }),
});

async function mapPhoto(client: ReturnType<typeof requestSupabase>, row: Record<string, unknown>) {
  if (typeof row.storage_path !== "string")
    throw new AppError("Photo storage path is missing", 500);
  const { data, error } = await client.storage
    .from(storageBucket)
    .createSignedUrl(row.storage_path, 3600);
  if (error) throw error;
  return {
    id: row.id,
    url: data.signedUrl,
    caption: row.caption,
    category: row.category,
    takenAt: row.taken_at,
    uploader: row.uploader,
    workOrderId: row.work_order_id,
    deficiencyId: row.deficiency_id,
    inspectionId: row.inspection_id,
    location: {
      lat: row.location_lat,
      lng: row.location_lng,
      accuracy: row.location_accuracy,
      capturedAt: row.taken_at,
    },
    syncStatus: row.sync_status === "Synced" ? "synced" : "pending",
  };
}

router.get("/", async (req, res, next) => {
  try {
    const client = requestSupabase(req);
    const { data, error } = await client
      .from("photo_evidence")
      .select("*")
      .order("taken_at", { ascending: false });
    throwOnSupabaseError(error);
    res.json(await Promise.all((data ?? []).map((row) => mapPhoto(client, row))));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const client = requestSupabase(req);
  let uploadedPath: string | undefined;
  let storageIsReferenced = false;
  try {
    const payload = photoSchema.parse(req.body);
    const match = payload.url.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res
        .status(400)
        .json({ message: "Photo must be provided as a supported JPEG, PNG, or WebP data URL" });
    }

    const contentType = match[1];
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
      return res.status(413).json({ message: "Photo must be between 1 byte and 8 MB" });
    }
    const extension = contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length);
    const photoId = payload.id ?? randomUUID();
    uploadedPath = `${req.user!.userId}/${photoId}.${extension}`;

    const { error: uploadError } = await client.storage
      .from(storageBucket)
      .upload(uploadedPath, bytes, {
        contentType,
        upsert: Boolean(payload.id),
      });
    if (uploadError) throw uploadError;

    const timestamp = new Date().toISOString();
    const { data: inserted, error } = await client
      .from("photo_evidence")
      .upsert(
        {
          ...(payload.id ? { id: payload.id } : {}),
          url: null,
          storage_path: uploadedPath,
          caption: payload.caption,
          category: payload.category,
          taken_at: payload.location.capturedAt,
          uploader: req.user!.userId,
          work_order_id: payload.workOrderId,
          deficiency_id: payload.deficiencyId ?? null,
          inspection_id: payload.inspectionId ?? null,
          location_lat: payload.location.lat,
          location_lng: payload.location.lng,
          location_accuracy: Math.round(payload.location.accuracy),
          sync_status: "Synced",
          updated_at: timestamp,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("*")
      .maybeSingle();
    throwOnSupabaseError(error);
    storageIsReferenced = true;

    const { data, error: lookupError } = inserted
      ? { data: inserted, error: null }
      : await client.from("photo_evidence").select("*").eq("id", photoId).single();
    throwOnSupabaseError(lookupError);
    if (!data) throw new AppError("Supabase did not return the saved photo", 500);
    res.status(201).json(await mapPhoto(client, data));
  } catch (error) {
    if (uploadedPath && !storageIsReferenced) {
      const { error: cleanupError } = await client.storage
        .from(storageBucket)
        .remove([uploadedPath]);
      if (cleanupError) console.error("[siteflow] photo cleanup failed", cleanupError.message);
    }
    next(error);
  }
});

router.patch("/:id/caption", async (req, res, next) => {
  try {
    const caption = z.string().trim().max(500).parse(req.body.caption);
    const client = requestSupabase(req);
    const { data, error } = await client
      .from("photo_evidence")
      .update({ caption, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();
    throwOnSupabaseError(error);
    if (!data) throw notFound("Photo");
    res.json(await mapPhoto(client, data));
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const client = requestSupabase(req);
    const { data: photo, error: readError } = await client
      .from("photo_evidence")
      .select("storage_path")
      .eq("id", req.params.id)
      .maybeSingle();
    throwOnSupabaseError(readError);
    if (!photo) return res.status(204).end();

    if (photo.storage_path) {
      const { error: removeError } = await client.storage
        .from(storageBucket)
        .remove([photo.storage_path]);
      if (removeError) throw removeError;
    }
    const { error } = await client.from("photo_evidence").delete().eq("id", req.params.id);
    throwOnSupabaseError(error);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
