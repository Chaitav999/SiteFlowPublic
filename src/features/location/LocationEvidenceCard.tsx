import { useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureLocation } from "@/services";
import type { GeoPoint, LocationEvidence } from "@/types";
import { fmtCoord, fmtDateTime } from "@/utils/format";

interface Props {
  value?: LocationEvidence;
  near: GeoPoint;
  onCapture?: (loc: LocationEvidence) => void;
  compact?: boolean;
}

/** Displays GPS evidence and lets the user capture a (simulated) fix. */
export function LocationEvidenceCard({ value, near, onCapture, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const capture = async () => {
    setBusy(true);
    const loc = await captureLocation(near);
    setBusy(false);
    onCapture?.(loc);
  };
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground"><MapPin className="size-4 text-info" /> Location evidence</p>
        {onCapture && (
          <Button type="button" variant="outline" size={compact ? "sm" : "default"} onClick={capture} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Crosshair />}
            {busy ? "Acquiring…" : value ? "Recapture" : "Capture location"}
          </Button>
        )}
      </div>
      {value ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <div><dt className="eyebrow">Latitude</dt><dd className="font-mono text-sm">{fmtCoord(value.lat)}</dd></div>
          <div><dt className="eyebrow">Longitude</dt><dd className="font-mono text-sm">{fmtCoord(value.lng)}</dd></div>
          <div><dt className="eyebrow">Accuracy</dt><dd className="font-mono text-sm">±{value.accuracy}m</dd></div>
          <div><dt className="eyebrow">Timestamp</dt><dd className="text-sm">{fmtDateTime(value.capturedAt)}</dd></div>
        </dl>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No location captured yet.</p>
      )}
    </div>
  );
}
