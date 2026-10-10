import { useMemo, useState } from "react";
import { Camera, ImageOff, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState, StatusBadge, SyncFlag } from "@/components/app/primitives";
import { useAppStore } from "@/store/appStore";
import { photoService } from "@/services";
import { resolvePhotoUrl } from "@/data/photoSamples";
import type { GeoPoint, PhotoEvidence } from "@/types";
import { fmtCoord, fmtDateTime } from "@/utils/format";
import { PhotoCaptureDialog } from "./PhotoCaptureDialog";

interface Props {
  workOrderId?: string;
  deficiencyId?: string;
  near?: GeoPoint;
  allowAdd?: boolean;
}

export function PhotoGallery({ workOrderId, deficiencyId, near, allowAdd = true }: Props) {
  const all = useAppStore((s) => s.photos);
  const photos = useMemo(
    () => all.filter((p) => (deficiencyId ? p.deficiencyId === deficiencyId : p.workOrderId === workOrderId)),
    [all, workOrderId, deficiencyId],
  );
  const [preview, setPreview] = useState<PhotoEvidence | null>(null);
  const [adding, setAdding] = useState(false);
  const [caption, setCaption] = useState("");

  const open = (p: PhotoEvidence) => { setPreview(p); setCaption(p.caption); };

  return (
    <div>
      {allowAdd && workOrderId && near && (
        <div className="mb-3 flex justify-end">
          <Button variant="outline" onClick={() => setAdding(true)}><Camera /> Add photo</Button>
          <PhotoCaptureDialog open={adding} onOpenChange={setAdding} workOrderId={workOrderId} deficiencyId={deficiencyId} near={near} defaultCategory={deficiencyId ? "Deficiency" : "During"} />
        </div>
      )}
      {photos.length === 0 ? (
        <EmptyState icon={ImageOff} title="No photo evidence yet" body="Photos captured in the field appear here with GPS and timestamp." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => open(p)} className="group block w-full overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md">
                <div className="relative">
                  <img src={resolvePhotoUrl(p.url)} alt={p.caption} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute left-2 top-2"><StatusBadge value={p.category} tone={p.category === "Deficiency" ? "critical" : p.category === "Safety" ? "warning" : "info"} className="bg-card" /></span>
                </div>
                <div className="space-y-0.5 p-2.5">
                  <p className="truncate text-sm font-medium text-foreground">{p.caption}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(p.takenAt)} · {p.uploader}</p>
                  <SyncFlag status={p.syncStatus} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader><DialogTitle className="font-mono text-base">{preview.id} · {preview.category}</DialogTitle></DialogHeader>
              <img src={resolvePhotoUrl(preview.url)} alt={preview.caption} className="max-h-[50vh] w-full rounded-md object-contain bg-muted" />
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="eyebrow">Taken</dt><dd>{fmtDateTime(preview.takenAt)}</dd></div>
                <div><dt className="eyebrow">Uploader</dt><dd>{preview.uploader}</dd></div>
                <div><dt className="eyebrow">Work order</dt><dd className="font-mono">{preview.workOrderId}</dd></div>
                <div><dt className="eyebrow">Location</dt><dd className="flex items-center gap-1 font-mono text-xs"><MapPin className="size-3" />{fmtCoord(preview.location.lat)}, {fmtCoord(preview.location.lng)} ±{preview.location.accuracy}m</dd></div>
              </dl>
              <div className="flex gap-2">
                <Input aria-label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
                <Button variant="outline" onClick={() => { photoService.updateCaption(preview.id, caption); toast.success("Caption updated"); }}>Save</Button>
                <Button variant="destructive" aria-label="Remove photo" onClick={async () => { await photoService.remove(preview.id); setPreview(null); toast("Photo removed"); }}><Trash2 /></Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
