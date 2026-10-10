import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { captureLocation, measurementService } from "@/services";
import { useAppStore } from "@/store/appStore";
import type { GeoPoint } from "@/types";

const kinds = [
  { kind: "Damaged rail length", unit: "m" },
  { kind: "Pothole depth", unit: "mm" },
  { kind: "Crack width", unit: "mm" },
  { kind: "Rut depth", unit: "mm" },
  { kind: "Culvert blockage", unit: "%" },
  { kind: "Shoulder drop-off", unit: "mm" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workOrderId: string;
  inspectionId?: string;
  near: GeoPoint;
}

export function MeasurementDialog({ open, onOpenChange, workOrderId, inspectionId, near }: Props) {
  const online = useAppStore((s) => s.online);
  const [kind, setKind] = useState(kinds[0]);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Number(value);
    if (!value || Number.isNaN(n) || n <= 0) return setError("Enter a value greater than 0.");
    if (kind.unit === "%" && n > 100) return setError("Percentage cannot exceed 100.");
    setError("");
    setSaving(true);
    try {
      const location = await captureLocation(near);
      const m = await measurementService.create({
        workOrderId,
        inspectionId: inspectionId ?? undefined,
        kind: kind.kind,
        value: n,
        unit: kind.unit,
        notes: notes || undefined,
        location,
      });
      setValue("");
      setNotes("");
      onOpenChange(false);
      toast.success(`${m.id} recorded`, {
        description: online
          ? `${m.kind}: ${m.value} ${m.unit}`
          : "Saved offline — will sync when connection returns.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the measurement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record measurement</DialogTitle>
          <DialogDescription>{workOrderId}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Measurement type">
          {kinds.map((k) => (
            <button
              key={k.kind}
              type="button"
              role="radio"
              aria-checked={kind.kind === k.kind}
              onClick={() => setKind(k)}
              className={cn(
                "min-h-12 rounded-md border px-3 text-left text-sm font-medium hover:bg-accent",
                kind.kind === k.kind && "border-primary bg-primary/10 text-primary",
              )}
            >
              {k.kind}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-value">Value ({kind.unit})</Label>
          <Input
            id="m-value"
            inputMode="decimal"
            type="number"
            step="any"
            className="h-14 font-mono text-2xl"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
          />
          {error && <p className="text-xs text-critical">{error}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-notes">Notes (optional)</Label>
          <Input id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button size="lg" onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}Save measurement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
