import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, ClipboardCheck, ImagePlus, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, IdTag, PageHeader, Panel, StatusBadge, SyncFlag } from "@/components/app/primitives";
import { LocationEvidenceCard } from "@/features/location/LocationEvidenceCard";
import { PhotoCaptureDialog } from "@/features/photos/PhotoCaptureDialog";
import { PhotoGallery } from "@/features/photos/PhotoGallery";
import { ReportIssueDialog } from "@/features/deficiencies/ReportIssueDialog";
import { inspectionTemplates, severityRequired } from "@/data/inspectionTemplates";
import { useAppStore } from "@/store/appStore";
import { inspectionService } from "@/services";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";
import type { InspectionMeasurements, LocationEvidence } from "@/types";

export const Route = createFileRoute("/_shell/inspections/$id")({
  head: ({ params }) => pageMeta(`Inspection ${params.id}`, "Field inspection form with measurements, photo and GPS evidence."),
  component: InspectionForm,
});

function Choice({ options, value, onChange, invalid, label }: { options: string[]; value?: string; onChange: (v: string) => void; invalid?: boolean; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", options.length > 3 ? "grid-cols-2 sm:grid-cols-4" : options.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)}
          className={cn("h-12 rounded-md border text-sm font-semibold transition-colors hover:bg-accent", invalid && "border-critical/60", value === o && "border-primary bg-primary text-primary-foreground hover:bg-primary")}>
          {o}
        </button>
      ))}
    </div>
  );
}

function InspectionForm() {
  const { id } = Route.useParams();
  const inspection = useAppStore((s) => s.inspections.find((i) => i.id === id));
  const wo = useAppStore((s) => s.workOrders.find((w) => w.id === inspection?.workOrderId));
  const online = useAppStore((s) => s.online);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [m, setM] = useState<InspectionMeasurements>({});
  const [loc, setLoc] = useState<LocationEvidence | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [dialog, setDialog] = useState<"photo" | "upload" | "issue" | null>(null);

  useEffect(() => {
    if (!inspection) return;
    setAnswers(inspection.answers); setNotes(inspection.notes); setM(inspection.measurements); setLoc(inspection.locationEvidence);
  }, [inspection?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const questions = useMemo(() => (inspection ? inspectionTemplates[inspection.template] : []), [inspection]);
  if (!inspection || !wo) return <EmptyState icon={ClipboardCheck} title={`Inspection ${id} not found`} action={<Button asChild variant="outline"><Link to="/inspections">Back</Link></Button>} />;

  const locked = inspection.status === "Passed" || inspection.status === "Failed";
  const sevNeeded = severityRequired(answers);

  const validate = () => {
    const e: Record<string, string> = {};
    for (const q of questions) {
      const required = q.required || (q.id === "severity" && sevNeeded);
      if (required && !answers[q.id]) e[q.id] = "Required";
    }
    for (const k of ["length", "width", "height"] as const) {
      const v = m[k];
      if (v && (Number.isNaN(Number(v)) || Number(v) < 0)) e[k] = "Must be a positive number";
    }
    if (!loc) e.location = "Capture location before submitting";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (submit: boolean) => {
    if (submit && !validate()) { toast.error("Complete the required fields"); return; }
    setSaving(submit ? "submit" : "draft");
    const result = await inspectionService.save(inspection.id, { answers, notes, measurements: m, locationEvidence: loc }, submit);
    setSaving(null);
    const offlineNote = online ? undefined : "Saved offline — will sync when connection returns.";
    if (!submit) toast.success("Draft saved", { description: offlineNote });
    else if (result === "Passed") toast.success(`${inspection.id} submitted — passed`, { description: offlineNote });
    else toast.warning(`${inspection.id} submitted — action required`, { description: offlineNote ?? "Report a deficiency for the issues found.", action: { label: "Report issue", onClick: () => setDialog("issue") } });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/inspections" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Inspections</Link>
      <PageHeader eyebrow={`Inspection ID ${inspection.id}`} title={inspection.title}
        description={<span className="flex flex-wrap items-center gap-2">{inspection.locationLabel} · <Link to="/work-orders/$id" params={{ id: wo.id }} className="font-mono text-primary hover:underline">{wo.id}</Link> <StatusBadge value={inspection.status} /><SyncFlag status={inspection.syncStatus} /></span>} />

      <fieldset disabled={locked} className="space-y-4">
        <Panel title="Condition assessment">
          <div className="space-y-5">
            {questions.map((q) => {
              const required = q.required || (q.id === "severity" && sevNeeded);
              return (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-medium">{q.label}{required && <span className="text-critical"> *</span>}</p>
                  <Choice label={q.label} options={q.type === "boolean" ? ["Yes", "No"] : q.options!} value={answers[q.id]} invalid={!!errors[q.id]}
                    onChange={(v) => { setAnswers((a) => ({ ...a, [q.id]: v })); setErrors((e) => ({ ...e, [q.id]: "" })); }} />
                  {errors[q.id] && <p className="text-xs text-critical">{errors[q.id]}</p>}
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Measurements (metres)">
          <div className="grid grid-cols-3 gap-3">
            {(["length", "width", "height"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`m-${k}`} className="capitalize">{k}</Label>
                <Input id={`m-${k}`} inputMode="decimal" className="h-12 font-mono text-lg" value={m[k] ?? ""} onChange={(e) => setM((p) => ({ ...p, [k]: e.target.value }))} aria-invalid={!!errors[k]} />
                {errors[k] && <p className="text-xs text-critical">{errors[k]}</p>}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Notes"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Inspection notes" placeholder="Anything the office should know" /></Panel>
      </fieldset>

      <div className="mt-4 space-y-4">
        <Panel title="Evidence">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Button variant="secondary" className="h-14 font-semibold" onClick={() => setDialog("photo")}><Camera />TAKE PHOTO</Button>
            <Button variant="secondary" className="h-14 font-semibold" onClick={() => setDialog("upload")}><ImagePlus />UPLOAD PHOTO</Button>
            <Button variant="destructive" className="col-span-2 h-14 font-semibold sm:col-span-1" onClick={() => setDialog("issue")}><TriangleAlert />REPORT ISSUE</Button>
          </div>
          <LocationEvidenceCard value={loc} near={wo.location} onCapture={locked ? undefined : (l) => { setLoc(l); setErrors((e) => ({ ...e, location: "" })); }} />
          {errors.location && <p className="mt-1 text-xs text-critical">{errors.location}</p>}
          <div className="mt-4"><PhotoGallery workOrderId={wo.id} near={wo.location} allowAdd={false} /></div>
        </Panel>
      </div>

      {!locked && (
        <div className="sticky bottom-[76px] z-20 mt-4 flex gap-2 rounded-lg border bg-card p-3 shadow-lg lg:bottom-4">
          <Button variant="outline" className="h-14 flex-1" disabled={!!saving} onClick={() => save(false)}>{saving === "draft" && <Loader2 className="animate-spin" />}Save draft</Button>
          <Button className="h-14 flex-[2] text-base font-semibold" disabled={!!saving} onClick={() => save(true)}>{saving === "submit" && <Loader2 className="animate-spin" />}SUBMIT INSPECTION</Button>
        </div>
      )}
      {locked && <p className="mt-4 text-center text-sm text-muted-foreground">Submitted inspections are read-only. <IdTag>{inspection.id}</IdTag></p>}

      <PhotoCaptureDialog open={dialog === "photo" || dialog === "upload"} onOpenChange={(o) => !o && setDialog(null)} workOrderId={wo.id} inspectionId={inspection.id} near={wo.location} />
      <ReportIssueDialog open={dialog === "issue"} onOpenChange={(o) => !o && setDialog(null)} workOrderId={wo.id} inspectionId={inspection.id} />
    </div>
  );
}
