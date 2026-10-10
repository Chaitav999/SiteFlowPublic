import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { captureLocation, photoService } from "@/services";
import { resolvePhotoUrl, sampleKeys } from "@/data/photoSamples";
import type { GeoPoint, PhotoCategory } from "@/types";
import { useAppStore } from "@/store/appStore";
import { supabaseConfigured } from "@/lib/supabase";

export const photoCategories: PhotoCategory[] = [
  "Before",
  "During",
  "After",
  "Deficiency",
  "Safety",
  "Equipment",
];

/** Downscale captured images so they fit in local storage while offline. */
async function fileToDataUrl(file: File, max = 900): Promise<string> {
  const src = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workOrderId: string;
  near: GeoPoint;
  deficiencyId?: string;
  inspectionId?: string;
  defaultCategory?: PhotoCategory;
}

export function PhotoCaptureDialog({
  open,
  onOpenChange,
  workOrderId,
  near,
  deficiencyId,
  inspectionId,
  defaultCategory = "During",
}: Props) {
  const online = useAppStore((s) => s.online);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<PhotoCategory>(defaultCategory);
  const [saving, setSaving] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setUrl(null);
      setCaption("");
      setCategory(defaultCategory);
      if (cameraRef.current) cameraRef.current.value = "";
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }, [open, defaultCategory]);

  const reset = () => {
    setUrl(null);
    setCaption("");
    setCategory(defaultCategory);
    if (cameraRef.current) cameraRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      setUrl(await fileToDataUrl(f));
    } catch {
      toast.error("Could not read that image.");
    }
  };

  const save = async () => {
    if (!url) return;
    setSaving(true);
    try {
      const location = await captureLocation(near);
      const p = await photoService.add({
        url,
        caption: caption.trim() || `${category} photo`,
        category,
        workOrderId,
        deficiencyId,
        inspectionId,
        location,
      });
      toast.success(`Photo ${p.id} saved`, {
        description: online
          ? "Uploaded with GPS and timestamp."
          : "Saved offline — will sync when connection returns.",
      });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Could not save that photo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add photo evidence</DialogTitle>
          <DialogDescription>
            Linked to {workOrderId}. GPS and timestamp are attached automatically.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
          aria-label="Take photo"
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
          aria-label="Upload photo"
        />
        {url ? (
          <img
            src={resolvePhotoUrl(url)}
            alt="Preview"
            className="aspect-[4/3] w-full rounded-md border object-cover"
          />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-24 flex-col"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-6!" />
              Take photo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-24 flex-col"
              onClick={() => uploadRef.current?.click()}
            >
              <ImagePlus className="size-6!" />
              Upload
            </Button>
            {!supabaseConfigured && (
              <Button
                type="button"
                variant="outline"
                className="h-24 flex-col"
                onClick={() => {
                  setUrl(`sample:${sampleKeys[sampleIdx % sampleKeys.length]}`);
                  setSampleIdx((i) => i + 1);
                }}
              >
                <Sparkles className="size-6!" />
                Demo photo
              </Button>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="photo-cat">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as PhotoCategory)}>
              <SelectTrigger id="photo-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {photoCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="photo-caption">Caption</Label>
            <Input
              id="photo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Sheared post #3"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {url && (
            <Button variant="ghost" onClick={() => setUrl(null)}>
              Retake
            </Button>
          )}
          <Button onClick={save} disabled={!url || saving}>
            {saving && <Loader2 className="animate-spin" />}Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
