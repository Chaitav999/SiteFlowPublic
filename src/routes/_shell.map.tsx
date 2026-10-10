import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailRow, EmptyState, IdTag, PageHeader, StatusBadge, toneFor } from "@/components/app/primitives";
import { MapLegend, OpsMap, type MapMarker } from "@/features/map/OpsMap";
import { useAppStore } from "@/store/appStore";
import { crews } from "@/data/seed";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_shell/map")({
  head: () => pageMeta("Operations Map", "Live map of crews, jobs, deficiencies and inspections across the highway network."),
  component: MapPage,
});

const filters = [
  { id: "all", label: "All" }, { id: "crew", label: "Crews" }, { id: "workOrder", label: "Jobs" },
  { id: "deficiency", label: "Deficiencies" }, { id: "inspection", label: "Inspections" },
] as const;

function MapPage() {
  const workOrders = useAppStore((s) => s.workOrders);
  const deficiencies = useAppStore((s) => s.deficiencies);
  const inspections = useAppStore((s) => s.inspections);
  const jobs = useAppStore((s) => s.jobs);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [selected, setSelected] = useState<MapMarker | null>(null);

  const markers = useMemo<MapMarker[]>(() => {
    const all: MapMarker[] = [
      ...workOrders.filter((w) => w.status !== "Completed").map((w) => ({ id: w.id, kind: "workOrder" as const, point: w.location, label: w.title, tone: toneFor(w.status) })),
      ...inspections.filter((i) => i.status === "Pending" || i.status === "In Progress").map((i) => {
        const wo = workOrders.find((w) => w.id === i.workOrderId)!;
        return { id: i.id, kind: "inspection" as const, point: { lat: wo.location.lat + 0.025, lng: wo.location.lng + 0.035 }, label: i.title, tone: "warning" as const };
      }),
      ...deficiencies.filter((d) => !["Resolved", "Verified"].includes(d.status)).map((d) => ({ id: d.id, kind: "deficiency" as const, point: { lat: d.location.lat - 0.02, lng: d.location.lng - 0.03 }, label: d.title, tone: toneFor(d.severity) })),
      ...crews.map((c) => ({ id: c.id, kind: "crew" as const, point: { lat: c.location.lat + 0.04, lng: c.location.lng - 0.05 }, label: c.name, tone: "info" as const })),
    ];
    return filter === "all" ? all : all.filter((m) => m.kind === filter);
  }, [workOrders, inspections, deficiencies, filter]);

  return (
    <>
      <PageHeader title="Operations Map" description="Thompson–Okanagan highway network" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Map filter">
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
              className={cn("h-9 rounded-full border px-4 text-sm font-medium transition-colors", filter === f.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>{f.label}</button>
          ))}
        </div>
        <MapLegend />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="surface overflow-hidden p-1"><OpsMap markers={markers} selectedId={selected?.id} onSelect={setSelected} /></div>
        <aside className="surface p-4" aria-live="polite">
          {!selected ? <EmptyState icon={MousePointerClick} title="Select a marker" body="Tap any job, crew, deficiency or inspection to see details." /> : <SelectedDetail m={selected} jobs={jobs} />}
        </aside>
      </div>
    </>
  );
}

function SelectedDetail({ m, jobs }: { m: MapMarker; jobs: { id: string; workOrderId: string; inspectionId?: string }[] }) {
  const wo = useAppStore((s) => s.workOrders.find((w) => w.id === m.id));
  const def = useAppStore((s) => s.deficiencies.find((d) => d.id === m.id));
  const ins = useAppStore((s) => s.inspections.find((i) => i.id === m.id));
  const crew = crews.find((c) => c.id === m.id);

  if (wo) {
    const job = jobs.find((j) => j.workOrderId === wo.id);
    return (
      <div className="space-y-3">
        <p className="eyebrow">{wo.highway} · KM {wo.km}</p>
        <h2 className="text-lg font-semibold">{wo.title}</h2>
        <dl className="grid grid-cols-2 gap-3">
          <DetailRow label="Status"><StatusBadge value={wo.status} /></DetailRow>
          <DetailRow label="Priority"><StatusBadge value={wo.priority} /></DetailRow>
          <DetailRow label="Crew">{crews.find((c) => c.id === wo.crewId)?.name}</DetailRow>
          <DetailRow label="ID"><IdTag>{wo.id}</IdTag></DetailRow>
        </dl>
        <div className="flex flex-col gap-2">
          {job && <Button asChild><Link to="/jobs/$id" params={{ id: job.id }}>VIEW JOB</Link></Button>}
          {job?.inspectionId && <Button asChild variant="outline"><Link to="/inspections/$id" params={{ id: job.inspectionId }}>VIEW INSPECTION</Link></Button>}
          <Button asChild variant="ghost"><Link to="/work-orders/$id" params={{ id: wo.id }}>Open work order</Link></Button>
        </div>
      </div>
    );
  }
  if (def) return (
    <div className="space-y-3">
      <p className="eyebrow">{def.locationLabel}</p><h2 className="text-lg font-semibold">{def.title}</h2>
      <div className="flex gap-2"><StatusBadge value={def.severity} /><StatusBadge value={def.status} /></div>
      <p className="text-sm text-muted-foreground">{def.description}</p>
      <Button asChild className="w-full"><Link to="/deficiencies/$id" params={{ id: def.id }}>VIEW DEFICIENCY</Link></Button>
    </div>
  );
  if (ins) return (
    <div className="space-y-3">
      <p className="eyebrow">{ins.locationLabel}</p><h2 className="text-lg font-semibold">{ins.title}</h2>
      <StatusBadge value={ins.status} /><p className="text-sm text-muted-foreground">Inspector: {ins.inspector}</p>
      <Button asChild className="w-full"><Link to="/inspections/$id" params={{ id: ins.id }}>VIEW INSPECTION</Link></Button>
    </div>
  );
  if (crew) return (
    <div className="space-y-3">
      <p className="eyebrow">{crew.locationLabel}</p><h2 className="text-lg font-semibold">{crew.name}</h2>
      <p className="text-sm text-muted-foreground">{crew.specialty} · {crew.members.length} members</p>
      <StatusBadge value={crew.status} />
      {crew.currentWorkOrderId && <Button asChild className="w-full"><Link to="/work-orders/$id" params={{ id: crew.currentWorkOrderId }}>VIEW ASSIGNMENT</Link></Button>}
    </div>
  );
  return null;
}
