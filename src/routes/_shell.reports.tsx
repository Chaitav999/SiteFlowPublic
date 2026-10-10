import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Download, FileBarChart, Loader2, TimerOff, TrendingUp, TriangleAlert } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard, PageHeader, Panel } from "@/components/app/primitives";
import { FilterSelect, asOptions } from "@/components/app/FilterSelect";
import { SectionGuard } from "@/components/layout/SectionGuard";
import { reportCatalog, reportService } from "@/services";
import { crews, highways, projects } from "@/data/seed";
import { useSession } from "@/hooks/useSession";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";
import { fmtShortDate } from "@/utils/format";
import type { ReportKind } from "@/types";

export const Route = createFileRoute("/_shell/reports")({
  head: () => pageMeta("Reports", "Operations, maintenance, inspection, deficiency and crew productivity reports."),
  component: () => (
    <SectionGuard section="reports">
      <ReportsPage />
    </SectionGuard>
  ),
});

const axis = { tickLine: false, axisLine: false, fontSize: 12 } as const;

function ReportsPage() {
  const { role } = useSession();
  const [kind, setKind] = useState<ReportKind>("weekly");
  const [days, setDays] = useState("7");
  const [projectId, setProjectId] = useState("all");
  const [highway, setHighway] = useState("all");
  const [crewId, setCrewId] = useState("all");
  const [exporting, setExporting] = useState(false);

  const effectiveDays = kind === "daily" ? 1 : days === "all" ? 30 : Number(days);
  const rows = useMemo(() => reportService.query({ days: effectiveDays, projectId, highway, crewId }), [effectiveDays, projectId, highway, crewId]);
  const daily = useMemo(() => reportService.byDay(rows).map((d) => ({ ...d, label: fmtShortDate(d.date), passRate: d.inspections ? Math.round((d.inspectionsPassed / d.inspections) * 100) : 100 })), [rows]);
  const sum = (k: "jobsCompleted" | "jobsDelayed" | "deficienciesCreated" | "deficienciesResolved" | "inspections" | "inspectionsPassed" | "hours") => rows.reduce((a, r) => a + r[k], 0);
  const passRate = sum("inspections") ? Math.round((sum("inspectionsPassed") / sum("inspections")) * 100) : 0;
  const byCrew = crews.map((c) => {
    const r = rows.filter((x) => x.crewId === c.id);
    return { name: c.name, jobs: r.reduce((a, x) => a + x.jobsCompleted, 0), delayed: r.reduce((a, x) => a + x.jobsDelayed, 0), hours: +r.reduce((a, x) => a + x.hours, 0).toFixed(1) };
  });
  const current = reportCatalog.find((r) => r.id === kind)!;

  const exportReport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 700));
    const blob = new Blob([reportService.toCsv(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `siteflow-${kind}-report.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExporting(false);
    toast.success("Report exported", { description: `${rows.length} rows · ${current.name}` });
  };

  return (
    <>
      <PageHeader title="Reports" description={current.description}
        actions={can(role, "exportReports") && <Button size="lg" onClick={exportReport} disabled={exporting}>{exporting ? <Loader2 className="animate-spin" /> : <Download />}EXPORT REPORT</Button>} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {reportCatalog.map((r) => (
          <button key={r.id} role="tab" aria-selected={kind === r.id} onClick={() => setKind(r.id)}
            className={cn("flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium", kind === r.id ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-accent")}>
            <FileBarChart className="size-4" />{r.name}
          </button>
        ))}
      </div>
      <div className="surface mb-4 grid grid-cols-2 gap-2 p-3 sm:flex sm:flex-wrap">
        {kind !== "daily" && <FilterSelect label="Range" value={days} onChange={setDays} allLabel="Last 30 days" options={[{ value: "7", label: "Last 7 days" }, { value: "14", label: "Last 14 days" }, { value: "30", label: "Last 30 days" }].slice(0, 2)} />}
        <FilterSelect label="Project" value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} className="w-full sm:w-56" />
        <FilterSelect label="Highway" value={highway} onChange={setHighway} options={asOptions(highways)} />
        <FilterSelect label="Crew" value={crewId} onChange={setCrewId} options={crews.map((c) => ({ value: c.id, label: c.name }))} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Jobs completed" value={sum("jobsCompleted")} icon={CheckCircle2} tone="success" />
        <KpiCard label="Jobs delayed" value={sum("jobsDelayed")} icon={TimerOff} tone="critical" />
        <KpiCard label="Deficiencies created" value={sum("deficienciesCreated")} icon={TriangleAlert} tone="warning" />
        <KpiCard label="Deficiencies resolved" value={sum("deficienciesResolved")} icon={CheckCircle2} tone="info" />
        <KpiCard label="Inspection pass rate" value={`${passRate}%`} icon={TrendingUp} tone="success" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Jobs completed vs delayed">
          <div className="h-60"><ResponsiveContainer><BarChart data={daily}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={28} allowDecimals={false} /><Tooltip cursor={{ fill: "var(--muted)" }} /><Legend /><Bar dataKey="jobsCompleted" name="Completed" fill="var(--chart-2)" radius={[3, 3, 0, 0]} /><Bar dataKey="jobsDelayed" name="Delayed" fill="var(--chart-4)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Deficiencies created vs resolved">
          <div className="h-60"><ResponsiveContainer><LineChart data={daily}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={28} allowDecimals={false} /><Tooltip /><Legend /><Line dataKey="deficienciesCreated" name="Created" stroke="var(--chart-3)" strokeWidth={2} dot={false} /><Line dataKey="deficienciesResolved" name="Resolved" stroke="var(--chart-1)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Inspection pass rate (%)">
          <div className="h-60"><ResponsiveContainer><AreaChart data={daily}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={32} domain={[0, 100]} /><Tooltip /><Area dataKey="passRate" name="Pass rate" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Crew productivity" bodyClassName="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Crew</TableHead><TableHead className="text-right">Jobs</TableHead><TableHead className="text-right">Delayed</TableHead><TableHead className="text-right">Hours</TableHead><TableHead className="text-right">Jobs/10h</TableHead></TableRow></TableHeader>
            <TableBody>{byCrew.map((c) => (
              <TableRow key={c.name}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-right font-mono">{c.jobs}</TableCell><TableCell className="text-right font-mono">{c.delayed}</TableCell><TableCell className="text-right font-mono">{c.hours}</TableCell><TableCell className="text-right font-mono">{c.hours ? ((c.jobs / c.hours) * 10).toFixed(1) : "—"}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
