import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, CheckCircle2, ClipboardCheck, HardHat, Loader2, Pause, Play, Ruler, ShieldAlert, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, IdTag, Panel, StatusBadge, SyncFlag, TimeAgo } from "@/components/app/primitives";
import { PhotoGallery } from "@/features/photos/PhotoGallery";
import { PhotoCaptureDialog } from "@/features/photos/PhotoCaptureDialog";
import { ReportIssueDialog } from "@/features/deficiencies/ReportIssueDialog";
import { MeasurementDialog } from "@/features/measurements/MeasurementDialog";
import { LocationEvidenceCard } from "@/features/location/LocationEvidenceCard";
import { useAppStore } from "@/store/appStore";
import { crews } from "@/data/seed";
import { fieldJobService, workOrderService } from "@/services";
import { pageMeta } from "@/lib/meta";
import { fmtTime } from "@/utils/format";
import type { LocationEvidence } from "@/types";

export const Route = createFileRoute("/_shell/jobs/$id")({
  head: ({ params }) => pageMeta(`Field Job ${params.id}`, "Start, document and complete a field job."),
  component: FieldJobPage,
});

function FieldJobPage() {
  const { id } = Route.useParams();
  const job = useAppStore((s) => s.jobs.find((j) => j.id === id));
  const workOrders = useAppStore((s) => s.workOrders);
  const allDefs = useAppStore((s) => s.deficiencies);
  const allMeas = useAppStore((s) => s.measurements);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"photo" | "issue" | "measure" | "complete" | null>(null);
  const [gps, setGps] = useState<LocationEvidence | undefined>();

  const wo = workOrders.find((w) => w.id === job?.workOrderId);
  const defs = useMemo(() => allDefs.filter((d) => d.workOrderId === wo?.id), [allDefs, wo?.id]);
  const meas = useMemo(() => allMeas.filter((m) => m.workOrderId === wo?.id), [allMeas, wo?.id]);

  if (!job || !wo) return <EmptyState icon={HardHat} title={`Job ${id} not found`} action={<Button asChild variant="outline"><Link to="/jobs">Back to jobs</Link></Button>} />;

  const crew = crews.find((c) => c.id === job.crewId);
  const remaining = wo.checklist.filter((c) => !c.done).length;
  const run = async (key: string, fn: () => Promise<void>, msg: string) => { setBusy(key); await fn(); setBusy(null); toast.success(msg); };
  const big = "h-16 text-base font-semibold [&_svg]:size-6";

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/jobs" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Today's jobs</Link>

      <section className="surface overflow-hidden">
        <div className="hazard-stripe h-1.5" aria-hidden />
        <div className="p-5">
          <div className="flex items-center justify-between gap-2"><IdTag>{job.id} · {wo.id}</IdTag><div className="flex gap-2"><SyncFlag status={job.syncStatus} /><StatusBadge value={job.status} className="text-sm" /></div></div>
          <h1 className="mt-2 text-2xl font-bold uppercase tracking-tight">{wo.title}</h1>
          <p className="mt-1 text-lg text-muted-foreground">{wo.locationLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm"><StatusBadge value={wo.priority} label={`${wo.priority} priority`} /><span className="text-muted-foreground">{crew?.name} · Scheduled {fmtTime(job.scheduledAt)}{job.startedAt && ` · Started ${fmtTime(job.startedAt)}`}</span></div>
        </div>
        <div className="grid grid-cols-1 gap-2 border-t bg-muted/40 p-3 sm:grid-cols-2">
          {job.status !== "In Progress" && job.status !== "Completed" && (
            <Button className={big} disabled={!!busy} onClick={() => run("start", () => fieldJobService.start(job.id), "Job started")}>{busy === "start" ? <Loader2 className="animate-spin" /> : <Play />}{job.status === "Paused" ? "RESUME JOB" : "START JOB"}</Button>
          )}
          {job.status === "In Progress" && (
            <Button variant="outline" className={big} disabled={!!busy} onClick={() => run("pause", () => fieldJobService.pause(job.id), "Job paused")}><Pause />PAUSE JOB</Button>
          )}
          {job.inspectionId && (
            <Button asChild variant="secondary" className={big}><Link to="/inspections/$id" params={{ id: job.inspectionId }}><ClipboardCheck />START INSPECTION</Link></Button>
          )}
          <Button variant="secondary" className={big} onClick={() => setDialog("photo")}><Camera />TAKE PHOTO</Button>
          <Button variant="secondary" className={big} onClick={() => setDialog("measure")}><Ruler />RECORD MEASUREMENT</Button>
          <Button variant="destructive" className={big} onClick={() => setDialog("issue")}><TriangleAlert />REPORT ISSUE</Button>
          {job.status !== "Completed" && (
            <Button className={`${big} bg-success text-primary-foreground hover:bg-success/90`} disabled={job.status === "Assigned"} onClick={() => setDialog("complete")}><CheckCircle2 />COMPLETE JOB</Button>
          )}
        </div>
      </section>

      <div className="mt-4 space-y-4">
        <Panel title={<span className="flex items-center gap-2 text-warning"><ShieldAlert className="size-4" />Safety notes</span>} className="border-warning/40">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{job.safetyNotes.map((n) => <li key={n}>{n}</li>)}</ul>
        </Panel>
        <Panel title="Instructions"><ol className="list-decimal space-y-1.5 pl-5 text-sm">{job.instructions.map((n) => <li key={n}>{n}</li>)}</ol></Panel>
        <Panel title={`Checklist · ${wo.checklist.length - remaining}/${wo.checklist.length}`}>
          <ul className="space-y-1">{wo.checklist.map((c) => (
            <li key={c.id}><label className="flex min-h-14 cursor-pointer items-center gap-4 rounded-md border px-3 hover:bg-accent">
              <Checkbox className="size-6" checked={c.done} onCheckedChange={() => workOrderService.toggleChecklistItem(wo.id, c.id)} />
              <span className={c.done ? "text-muted-foreground line-through" : "font-medium"}>{c.label}</span>
            </label></li>
          ))}</ul>
        </Panel>
        <Panel title="GPS"><LocationEvidenceCard value={gps} near={wo.location} onCapture={(l) => { setGps(l); toast.success("Location captured", { description: `±${l.accuracy}m` }); }} /></Panel>
        <Panel title="Photos"><PhotoGallery workOrderId={wo.id} near={wo.location} allowAdd={false} /></Panel>
        <Panel title="Measurements">
          {meas.length === 0 ? <p className="text-sm text-muted-foreground">No measurements yet.</p> : (
            <ul className="divide-y text-sm">{meas.map((m) => <li key={m.id} className="flex items-center justify-between py-2.5"><span><IdTag>{m.id}</IdTag> {m.kind}</span><span className="flex items-center gap-2 font-mono text-base">{m.value} {m.unit}<SyncFlag status={m.syncStatus} /></span></li>)}</ul>
          )}
        </Panel>
        <Panel title="Deficiencies" bodyClassName="p-0">
          {defs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No deficiencies reported.</p> : (
            <ul className="divide-y">{defs.map((d) => (
              <li key={d.id}><Link to="/deficiencies/$id" params={{ id: d.id }} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-accent/60">
                <div className="flex-1"><p className="font-medium">{d.title}</p><p className="text-xs text-muted-foreground"><IdTag>{d.id}</IdTag> · <TimeAgo iso={d.reportedAt} /></p></div>
                <SyncFlag status={d.syncStatus} /><StatusBadge value={d.severity} />
              </Link></li>
            ))}</ul>
          )}
        </Panel>
      </div>

      <PhotoCaptureDialog open={dialog === "photo"} onOpenChange={(o) => setDialog(o ? "photo" : null)} workOrderId={wo.id} near={wo.location} />
      <ReportIssueDialog open={dialog === "issue"} onOpenChange={(o) => setDialog(o ? "issue" : null)} workOrderId={wo.id} inspectionId={job.inspectionId} />
      <MeasurementDialog open={dialog === "measure"} onOpenChange={(o) => setDialog(o ? "measure" : null)} workOrderId={wo.id} inspectionId={job.inspectionId} near={wo.location} />
      <AlertDialog open={dialog === "complete"} onOpenChange={(o) => setDialog(o ? "complete" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this job?</AlertDialogTitle>
            <AlertDialogDescription>{remaining > 0 ? `${remaining} checklist item${remaining === 1 ? " is" : "s are"} still open. ` : ""}The work order will be sent to your supervisor for review.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => run("complete", () => fieldJobService.complete(job.id), "Job completed — sent for review")}>Complete job</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
