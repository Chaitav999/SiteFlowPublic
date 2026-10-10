import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Plus, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, IdTag, PageHeader, StatusBadge, SyncFlag, TimeAgo } from "@/components/app/primitives";
import { FilterSelect, asOptions } from "@/components/app/FilterSelect";
import { ReportIssueDialog } from "@/features/deficiencies/ReportIssueDialog";
import { useAppStore } from "@/store/appStore";
import { highways } from "@/data/seed";
import { pageMeta } from "@/lib/meta";
import type { Priority } from "@/types";

export const Route = createFileRoute("/_shell/deficiencies/")({
  head: () => pageMeta("Deficiencies", "Problems discovered in the field, from report to verified fix."),
  component: DeficienciesPage,
});

const rank: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function DeficienciesPage() {
  const deficiencies = useAppStore((s) => s.deficiencies);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [severity, setSeverity] = useState("all");
  const [highway, setHighway] = useState("all");
  const [reporting, setReporting] = useState(false);

  const list = useMemo(() => {
    const term = q.toLowerCase();
    return deficiencies.filter((d) =>
      (!term || `${d.id} ${d.title} ${d.locationLabel}`.toLowerCase().includes(term)) &&
      (status === "all" || (status === "open" ? !["Resolved", "Verified"].includes(d.status) : d.status === status)) &&
      (severity === "all" || d.severity === severity) && (highway === "all" || d.highway === highway),
    ).sort((a, b) => rank[a.severity] - rank[b.severity] || b.reportedAt.localeCompare(a.reportedAt));
  }, [deficiencies, q, status, severity, highway]);

  return (
    <>
      <PageHeader title="Deficiencies" description={`${list.length} shown`} actions={<Button size="lg" onClick={() => setReporting(true)}><Plus /> Report deficiency</Button>} />
      <div className="surface mb-4 flex flex-col gap-2 p-3 md:flex-row md:items-center">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deficiencies" aria-label="Search deficiencies" /></div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "open", label: "Open (unresolved)" }, ...asOptions(["Open", "Assigned", "In Progress", "Resolved", "Verified"])]} />
          <FilterSelect label="Severity" value={severity} onChange={setSeverity} options={asOptions(["Critical", "High", "Medium", "Low"])} />
          <FilterSelect label="Highway" value={highway} onChange={setHighway} options={asOptions(highways)} />
        </div>
      </div>
      {list.length === 0 ? <EmptyState icon={CheckCircle2} title="No open deficiencies" body="Nothing matches these filters. Good news for the road." /> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((d) => (
            <li key={d.id}>
              <Link to="/deficiencies/$id" params={{ id: d.id }} className="surface flex h-full gap-3 p-4 transition-shadow hover:shadow-md">
                <TriangleAlert className={d.severity === "Critical" ? "size-5 shrink-0 text-critical" : d.severity === "High" ? "size-5 shrink-0 text-warning" : "size-5 shrink-0 text-muted-foreground"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><IdTag>{d.id}</IdTag><StatusBadge value={d.severity} /></div>
                  <p className="mt-1 font-semibold">{d.title}</p>
                  <p className="text-sm text-muted-foreground">{d.locationLabel}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><StatusBadge value={d.status} />{d.reportedBy} · <TimeAgo iso={d.reportedAt} /><SyncFlag status={d.syncStatus} /></div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ReportIssueDialog open={reporting} onOpenChange={setReporting} />
    </>
  );
}
