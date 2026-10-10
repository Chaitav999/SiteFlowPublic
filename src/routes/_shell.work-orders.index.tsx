import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, ClipboardList, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, IdTag, PageHeader, StatusBadge } from "@/components/app/primitives";
import { FilterSelect, asOptions } from "@/components/app/FilterSelect";
import { useAppStore } from "@/store/appStore";
import { crews, projects } from "@/data/seed";
import { pageMeta } from "@/lib/meta";
import { fmtDate } from "@/utils/format";
import type { Priority, WorkOrder } from "@/types";

export const Route = createFileRoute("/_shell/work-orders/")({
  head: () => pageMeta("Work Orders", "Search, filter and track every maintenance work order."),
  component: WorkOrdersPage,
});

const PAGE = 8;
const prioRank: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const crewName = (id: string) => crews.find((c) => c.id === id)?.name ?? id;
type SortKey = "id" | "dueDate" | "priority";

function WorkOrdersPage() {
  const workOrders = useAppStore((s) => s.workOrders);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [crew, setCrew] = useState("all");
  const [project, setProject] = useState("all");
  const [due, setDue] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "dueDate", dir: 1 });
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const today = "2026-10-08";
    const term = q.trim().toLowerCase();
    const filtered = workOrders.filter((w) =>
      (!term || [w.id, w.title, w.locationLabel, w.assignedTo].some((f) => f.toLowerCase().includes(term))) &&
      (status === "all" || w.status === status) &&
      (priority === "all" || w.priority === priority) &&
      (crew === "all" || w.crewId === crew) &&
      (project === "all" || w.projectId === project) &&
      (due === "all" || (due === "today" ? w.dueDate.startsWith(today) : due === "overdue" ? w.dueDate < today && w.status !== "Completed" : w.dueDate > today)),
    );
    const cmp = (a: WorkOrder, b: WorkOrder) =>
      sort.key === "priority" ? prioRank[a.priority] - prioRank[b.priority] : a[sort.key].localeCompare(b[sort.key]);
    return [...filtered].sort((a, b) => cmp(a, b) * sort.dir);
  }, [workOrders, q, status, priority, crew, project, due, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice(page * PAGE, page * PAGE + PAGE);
  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0); };

  const SortHead = ({ k, children }: { k: SortKey; children: string }) => (
    <TableHead><button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)} aria-label={`Sort by ${children}`}>{children}<ArrowUpDown className="size-3" /></button></TableHead>
  );

  return (
    <>
      <PageHeader title="Work Orders" description={`${rows.length} of ${workOrders.length} work orders`} />
      <div className="surface mb-4 flex flex-col gap-2 p-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 lg:min-w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => resetPage(setQ)(e.target.value)} placeholder="Search ID, job, location, assignee" className="pl-8" aria-label="Search work orders" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <FilterSelect label="Status" value={status} onChange={resetPage(setStatus)} options={asOptions(["Assigned", "In Progress", "Awaiting Review", "Completed", "Blocked"])} />
          <FilterSelect label="Priority" value={priority} onChange={resetPage(setPriority)} options={asOptions(["Critical", "High", "Medium", "Low"])} />
          <FilterSelect label="Crew" value={crew} onChange={resetPage(setCrew)} options={crews.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Project" value={project} onChange={resetPage(setProject)} options={projects.map((p) => ({ value: p.id, label: p.highway + " · " + p.id.replace("PRJ-", "") }))} />
          <FilterSelect label="Due" value={due} onChange={resetPage(setDue)} allLabel="Any" options={[{ value: "today", label: "Today" }, { value: "upcoming", label: "Upcoming" }, { value: "overdue", label: "Overdue" }]} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No work orders match these filters" body="Try clearing a filter or searching by work order ID." />
      ) : (
        <>
          <div className="surface hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead k="id">Work Order</SortHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Crew</TableHead>
                  <SortHead k="priority">Priority</SortHead>
                  <TableHead>Status</TableHead>
                  <SortHead k="dueDate">Due</SortHead>
                  <TableHead>Assigned to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((w) => (
                  <TableRow key={w.id} className="cursor-pointer">
                    <TableCell><Link to="/work-orders/$id" params={{ id: w.id }} className="font-mono text-sm font-medium text-primary hover:underline">{w.id}</Link></TableCell>
                    <TableCell className="font-medium">{w.title}</TableCell>
                    <TableCell className="text-muted-foreground">{w.locationLabel}</TableCell>
                    <TableCell>{crewName(w.crewId)}</TableCell>
                    <TableCell><StatusBadge value={w.priority} /></TableCell>
                    <TableCell><StatusBadge value={w.status} /></TableCell>
                    <TableCell className="whitespace-nowrap font-tabular">{fmtDate(w.dueDate)}</TableCell>
                    <TableCell>{w.assignedTo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="space-y-2 md:hidden">
            {visible.map((w) => (
              <li key={w.id}>
                <Link to="/work-orders/$id" params={{ id: w.id }} className="surface block p-4">
                  <div className="flex items-center justify-between"><IdTag>{w.id}</IdTag><StatusBadge value={w.status} /></div>
                  <p className="mt-1 font-semibold">{w.title}</p>
                  <p className="text-sm text-muted-foreground">{w.locationLabel}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><StatusBadge value={w.priority} />{crewName(w.crewId)} · Due {fmtDate(w.dueDate)}</div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
