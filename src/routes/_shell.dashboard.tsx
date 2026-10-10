import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ClipboardCheck, ClipboardList, HardHat, TriangleAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, PageHeader, Panel, StatusBadge, TimeAgo, Timeline, EmptyState } from "@/components/app/primitives";
import { useAppStore } from "@/store/appStore";
import { crews } from "@/data/seed";
import { reportService } from "@/services";
import { pageMeta } from "@/lib/meta";
import { fmtShortDate, fmtTime, fmtWeekday } from "@/utils/format";
import type { WorkOrderStatus } from "@/types";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => pageMeta("Operations Dashboard", "Live command center for work orders, crews, inspections and deficiencies."),
  component: Dashboard,
});

const statusColors: Record<WorkOrderStatus, string> = {
  Assigned: "var(--neutral)", "In Progress": "var(--info)", "Awaiting Review": "var(--warning)", Completed: "var(--success)", Blocked: "var(--critical)",
};

function Dashboard() {
  const hydrated = useAppStore((s) => s.hydrated);
  const workOrders = useAppStore((s) => s.workOrders);
  const jobs = useAppStore((s) => s.jobs);
  const inspections = useAppStore((s) => s.inspections);
  const deficiencies = useAppStore((s) => s.deficiencies);
  const activity = useAppStore((s) => s.activity);

  const kpis = useMemo(() => ({
    active: workOrders.filter((w) => w.status !== "Completed").length,
    jobsToday: jobs.length,
    pendingInspections: inspections.filter((i) => i.status === "Pending" || i.status === "In Progress").length,
    openDefs: deficiencies.filter((d) => d.status !== "Resolved" && d.status !== "Verified").length,
  }), [workOrders, jobs, inspections, deficiencies]);

  const weekly = useMemo(() => reportService.weeklyCompletion(), [jobs]);
  const completedWeek = weekly.reduce((a, d) => a + d.completed, 0);
  const statusData = useMemo(() => (Object.keys(statusColors) as WorkOrderStatus[]).map((s) => ({ name: s, value: workOrders.filter((w) => w.status === s).length })), [workOrders]);
  const critical = useMemo(() => deficiencies.filter((d) => (d.severity === "Critical" || d.severity === "High") && d.status !== "Resolved" && d.status !== "Verified").slice(0, 5), [deficiencies]);

  if (!hydrated) return <DashboardSkeleton />;

  return (
    <>
      <PageHeader eyebrow={fmtWeekday("2026-10-08T12:00:00-07:00")} title="Operations Dashboard" description="Thompson–Okanagan district · 5 crews in the field" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Active work orders" value={kpis.active} icon={ClipboardList} tone="info" />
        <KpiCard label="Jobs today" value={kpis.jobsToday} icon={HardHat} tone="neutral" />
        <KpiCard label="Inspections pending" value={kpis.pendingInspections} icon={ClipboardCheck} tone="warning" />
        <KpiCard label="Open deficiencies" value={kpis.openDefs} icon={TriangleAlert} tone="critical" />
        <KpiCard label="Completed this week" value={completedWeek} icon={CalendarCheck} tone="success" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Work order status">
          <div className="flex items-center gap-4">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                    {statusData.map((d) => <Cell key={d.name} fill={statusColors[d.name as WorkOrderStatus]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1.5 text-sm">
              {statusData.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: statusColors[d.name as WorkOrderStatus] }} />
                  <span className="flex-1 text-muted-foreground">{d.name}</span>
                  <span className="font-mono font-medium">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel title="Jobs completed — last 7 days" className="lg:col-span-2">
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={weekly.map((d) => ({ ...d, label: fmtShortDate(d.date) }))}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="completed" name="Completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Critical deficiencies" action={<Link to="/deficiencies" className="text-xs text-primary hover:underline">View all</Link>} bodyClassName="p-0">
          {critical.length === 0 ? <div className="p-4"><EmptyState icon={TriangleAlert} title="No open deficiencies" /></div> : (
            <ul className="divide-y">
              {critical.map((d) => (
                <li key={d.id}>
                  <Link to="/deficiencies/$id" params={{ id: d.id }} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/60">
                    <TriangleAlert className={d.severity === "Critical" ? "mt-0.5 size-4 text-critical" : "mt-0.5 size-4 text-warning"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{d.highway} · Reported <TimeAgo iso={d.reportedAt} /></p>
                    </div>
                    <StatusBadge value={d.severity} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Today's field activity" action={<Link to="/crews" className="text-xs text-primary hover:underline">Crews</Link>}>
          <ul className="space-y-2.5">
            {crews.map((c) => {
              const wo = workOrders.find((w) => w.id === c.currentWorkOrderId);
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-md border p-3">
                  <span className="grid size-9 place-items-center rounded-md bg-primary font-mono text-xs font-bold text-primary-foreground">{c.id.slice(3)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.name} <span className="font-normal text-muted-foreground">· {c.specialty}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{wo ? wo.title : "No active assignment"}</p>
                  </div>
                  <StatusBadge value={c.status === "Available" ? "Completed" : c.status === "On Site" ? "In Progress" : c.status} />
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Recent activity">
          <Timeline items={activity.slice(0, 7).map((a) => ({ id: a.id, time: fmtTime(a.at), title: a.message, body: a.actor, tone: a.tone }))} />
        </Panel>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="mb-6 h-12 w-72" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3"><Skeleton className="h-60" /><Skeleton className="h-60 lg:col-span-2" /></div>
    </div>
  );
}
