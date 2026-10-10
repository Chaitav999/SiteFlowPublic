import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, FileText, HardHat, MessageSquarePlus, Paperclip, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DetailRow, EmptyState, IdTag, PageHeader, Panel, StatusBadge, Timeline, TimeAgo } from "@/components/app/primitives";
import { PhotoGallery } from "@/features/photos/PhotoGallery";
import { OpsMap } from "@/features/map/OpsMap";
import { useAppStore } from "@/store/appStore";
import { crews, projects } from "@/data/seed";
import { workOrderService } from "@/services";
import { useSession } from "@/hooks/useSession";
import { can } from "@/lib/permissions";
import { pageMeta } from "@/lib/meta";
import { fmtCoord, fmtDate, fmtTime } from "@/utils/format";
import type { WorkOrderStatus } from "@/types";

export const Route = createFileRoute("/_shell/work-orders/$id")({
  head: ({ params }) => pageMeta(`Work Order ${params.id}`, `Details, checklist, evidence and activity for work order ${params.id}.`),
  component: WorkOrderDetail,
});

const statuses: WorkOrderStatus[] = ["Assigned", "In Progress", "Awaiting Review", "Completed", "Blocked"];

function WorkOrderDetail() {
  const { id } = Route.useParams();
  const { role } = useSession();
  const wo = useAppStore((s) => s.workOrders.find((w) => w.id === id));
  const allJobs = useAppStore((s) => s.jobs);
  const allDefs = useAppStore((s) => s.deficiencies);
  const allActivity = useAppStore((s) => s.activity);
  const allMeasurements = useAppStore((s) => s.measurements);
  const [note, setNote] = useState("");

  const job = allJobs.find((j) => j.workOrderId === id);
  const defs = useMemo(() => allDefs.filter((d) => d.workOrderId === id), [allDefs, id]);
  const activity = useMemo(() => allActivity.filter((a) => a.workOrderId === id), [allActivity, id]);
  const measurements = useMemo(() => allMeasurements.filter((m) => m.workOrderId === id), [allMeasurements, id]);

  if (!wo) return <EmptyState icon={FileText} title={`Work order ${id} not found`} action={<Button asChild variant="outline"><Link to="/work-orders">Back to work orders</Link></Button>} />;

  const crew = crews.find((c) => c.id === wo.crewId);
  const project = projects.find((p) => p.id === wo.projectId);
  const done = wo.checklist.filter((c) => c.done).length;

  return (
    <>
      <Link to="/work-orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Work orders</Link>
      <PageHeader
        eyebrow={wo.id}
        title={wo.title}
        description={<span className="flex flex-wrap items-center gap-2"><StatusBadge value={wo.status} /><StatusBadge value={wo.priority} label={`${wo.priority} priority`} /> {wo.locationLabel}</span>}
        actions={<>
          {job && <Button asChild size="lg"><Link to="/jobs/$id" params={{ id: job.id }}><HardHat /> Open field job</Link></Button>}
          {can(role, "approveWork") && (
            <Select value={wo.status} onValueChange={async (v) => { await workOrderService.updateStatus(wo.id, v as WorkOrderStatus); toast.success(`${wo.id} set to ${v}`); }}>
              <SelectTrigger className="h-10 w-48" aria-label="Change status"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </>}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Tabs defaultValue="overview">
          <TabsList className="mb-3 h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checklist">Checklist ({done}/{wo.checklist.length})</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="deficiencies">Deficiencies ({defs.length})</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Panel title="Description"><p className="text-sm leading-relaxed">{wo.description}</p></Panel>
            <div className="grid gap-4 md:grid-cols-2">
              <Panel title="Details">
                <dl className="grid grid-cols-2 gap-4">
                  <DetailRow label="Type">{wo.type}</DetailRow>
                  <DetailRow label="Project">{project?.name}</DetailRow>
                  <DetailRow label="Assigned to">{wo.assignedTo}</DetailRow>
                  <DetailRow label="Supervisor">{wo.supervisor}</DetailRow>
                  <DetailRow label="Due">{fmtDate(wo.dueDate)} {fmtTime(wo.dueDate)}</DetailRow>
                  <DetailRow label="Created">{fmtDate(wo.createdAt)}</DetailRow>
                </dl>
              </Panel>
              <Panel title="Crew">
                {crew && (
                  <>
                    <p className="font-medium">{crew.name} · <span className="text-muted-foreground">{crew.specialty}</span></p>
                    <ul className="mt-2 space-y-1 text-sm">{crew.members.map((m) => <li key={m.userId} className="flex justify-between"><span>{m.name}</span><span className="text-muted-foreground">{m.position}</span></li>)}</ul>
                    <p className="mt-3 text-xs text-muted-foreground">{crew.vehicle} · <StatusBadge value={crew.status} /></p>
                  </>
                )}
              </Panel>
            </div>
            <Panel title="Location" bodyClassName="p-0">
              <div className="h-64"><OpsMap markers={[{ id: wo.id, kind: "workOrder", point: wo.location, label: wo.title, tone: "info" }]} selectedId={wo.id} className="rounded-none" /></div>
              <p className="border-t px-4 py-2 font-mono text-xs text-muted-foreground">{wo.highway} · KM {wo.km} · {fmtCoord(wo.location.lat)}, {fmtCoord(wo.location.lng)}</p>
            </Panel>
            {measurements.length > 0 && (
              <Panel title="Measurements">
                <ul className="divide-y text-sm">{measurements.map((m) => <li key={m.id} className="flex justify-between py-2"><span><IdTag>{m.id}</IdTag> {m.kind}</span><span className="font-mono">{m.value} {m.unit}</span></li>)}</ul>
              </Panel>
            )}
          </TabsContent>
          <TabsContent value="checklist">
            <Panel>
              <ul className="space-y-1">
                {wo.checklist.map((c) => (
                  <li key={c.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-accent">
                      <Checkbox checked={c.done} onCheckedChange={() => workOrderService.toggleChecklistItem(wo.id, c.id)} className="size-5" />
                      <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Panel>
          </TabsContent>
          <TabsContent value="photos"><Panel><PhotoGallery workOrderId={wo.id} near={wo.location} /></Panel></TabsContent>
          <TabsContent value="deficiencies">
            <Panel bodyClassName="p-0">
              {defs.length === 0 ? <div className="p-4"><EmptyState icon={CheckCircle2} title="No deficiencies on this work order" /></div> : (
                <ul className="divide-y">{defs.map((d) => (
                  <li key={d.id}><Link to="/deficiencies/$id" params={{ id: d.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/60">
                    <TriangleAlert className="size-4 text-warning" /><div className="flex-1"><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted-foreground"><IdTag>{d.id}</IdTag> · <TimeAgo iso={d.reportedAt} /></p></div>
                    <StatusBadge value={d.severity} /><StatusBadge value={d.status} />
                  </Link></li>
                ))}</ul>
              )}
            </Panel>
          </TabsContent>
          <TabsContent value="attachments">
            <Panel>
              {wo.attachments.length === 0 ? <EmptyState icon={Paperclip} title="No attachments" /> : (
                <ul className="divide-y">{wo.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5"><FileText className="size-5 text-muted-foreground" /><span className="flex-1 text-sm">{a.name}</span><span className="font-mono text-xs uppercase text-muted-foreground">{a.kind} · {a.sizeKb} KB</span></li>
                ))}</ul>
              )}
            </Panel>
          </TabsContent>
        </Tabs>
        <Panel title="Activity">
          <form className="mb-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!note.trim()) return; await workOrderService.addNote(wo.id, note.trim()); setNote(""); toast.success("Note added"); }}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" aria-label="Add a note" />
            <Button type="submit" variant="outline" size="icon" aria-label="Add note"><MessageSquarePlus /></Button>
          </form>
          {activity.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <Timeline items={[...activity].reverse().map((a) => ({ id: a.id, time: fmtTime(a.at), title: a.message, body: a.actor, tone: a.tone }))} />
          )}
        </Panel>
      </div>
    </>
  );
}
