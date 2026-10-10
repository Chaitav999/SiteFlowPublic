import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { captureLocation, deficiencyService } from "@/services";
import { useAppStore } from "@/store/appStore";
import type { Priority } from "@/types";

const quickPicks = [
  { title: "Guardrail damage", category: "Guardrail" },
  { title: "Pothole", category: "Pavement" },
  { title: "Blocked drainage", category: "Drainage" },
  { title: "Missing sign", category: "Signage" },
  { title: "Debris on road", category: "Debris" },
  { title: "Shoulder drop-off", category: "Shoulder" },
];
const severities: Priority[] = ["Low", "Medium", "High", "Critical"];
const sevActive: Record<Priority, string> = {
  Low: "border-neutral bg-neutral/10 text-foreground",
  Medium: "border-info bg-info/10 text-info",
  High: "border-warning bg-warning/10 text-warning",
  Critical: "border-critical bg-critical/10 text-critical",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workOrderId?: string;
  inspectionId?: string;
}

export function ReportIssueDialog({ open, onOpenChange, workOrderId, inspectionId }: Props) {
  const workOrders = useAppStore((s) => s.workOrders);
  const online = useAppStore((s) => s.online);
  const navigate = useNavigate();
  const [woId, setWoId] = useState(workOrderId ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [severity, setSeverity] = useState<Priority | null>(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const effectiveWo = workOrderId ?? woId;

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Choose or type what you found.";
    if (!severity) e.severity = "Select a severity.";
    if (!effectiveWo) e.wo = "Link a work order.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const wo = workOrders.find((w) => w.id === effectiveWo);
      if (!wo)
        throw new Error("The selected work order is no longer available. Refresh and try again.");
      const location = await captureLocation(wo.location);
      const d = await deficiencyService.create({
        title: title.trim(),
        category,
        severity: severity!,
        description: description.trim() || title.trim(),
        highway: wo.highway,
        locationLabel: `${wo.highway}, KM ${wo.km}`,
        location,
        workOrderId: wo.id,
        inspectionId,
      });
      onOpenChange(false);
      setTitle("");
      setSeverity(null);
      setDescription("");
      toast.success(`${d.id} reported`, {
        description: online
          ? "Supervisors have been notified."
          : "Saved offline — will sync when connection returns.",
        action: {
          label: "View",
          onClick: () => navigate({ to: "/deficiencies/$id", params: { id: d.id } }),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the issue report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report issue</DialogTitle>
          <DialogDescription>GPS location is captured automatically.</DialogDescription>
        </DialogHeader>
        {!workOrderId && (
          <div className="space-y-1.5">
            <Label htmlFor="ri-wo">Work order</Label>
            <Select value={woId} onValueChange={setWoId}>
              <SelectTrigger id="ri-wo" aria-invalid={!!errors.wo}>
                <SelectValue placeholder="Select work order" />
              </SelectTrigger>
              <SelectContent>
                {workOrders.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.id} — {w.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.wo && <p className="text-xs text-critical">{errors.wo}</p>}
          </div>
        )}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What did you find?</legend>
          <div className="grid grid-cols-2 gap-2">
            {quickPicks.map((q) => (
              <button
                key={q.title}
                type="button"
                onClick={() => {
                  setTitle(q.title);
                  setCategory(q.category);
                }}
                className={cn(
                  "min-h-12 rounded-md border px-3 text-left text-sm font-medium transition-colors hover:bg-accent",
                  title === q.title && "border-primary bg-primary/10 text-primary",
                )}
              >
                {q.title}
              </button>
            ))}
          </div>
          <Input
            aria-label="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Or describe it briefly"
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="text-xs text-critical">{errors.title}</p>}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Severity</legend>
          <div className="grid grid-cols-4 gap-2" role="radiogroup">
            {severities.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={severity === s}
                onClick={() => setSeverity(s)}
                className={cn(
                  "h-12 rounded-md border text-sm font-semibold transition-colors hover:bg-accent",
                  severity === s && sevActive[s],
                )}
              >
                {s}
              </button>
            ))}
          </div>
          {errors.severity && <p className="text-xs text-critical">{errors.severity}</p>}
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="ri-desc">Notes (optional)</Label>
          <Textarea
            id="ri-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button size="lg" className="w-full sm:w-auto" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
