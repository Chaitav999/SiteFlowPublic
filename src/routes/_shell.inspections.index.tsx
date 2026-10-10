import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, IdTag, PageHeader, StatusBadge, SyncFlag } from "@/components/app/primitives";
import { useAppStore } from "@/store/appStore";
import { pageMeta } from "@/lib/meta";
import { fmtDateTime } from "@/utils/format";

export const Route = createFileRoute("/_shell/inspections/")({
  head: () => pageMeta("Inspections", "Scheduled, in-progress and submitted field inspections."),
  component: InspectionsPage,
});

const tabs = ["Open", "Passed", "Failed", "All"] as const;

function InspectionsPage() {
  const inspections = useAppStore((s) => s.inspections);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Open");
  const list = useMemo(() => inspections.filter((i) =>
    tab === "All" || (tab === "Open" ? i.status === "Pending" || i.status === "In Progress" : i.status === tab),
  ).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)), [inspections, tab]);
  const passRate = useMemo(() => {
    const done = inspections.filter((i) => i.status === "Passed" || i.status === "Failed");
    return done.length ? Math.round((done.filter((i) => i.status === "Passed").length / done.length) * 100) : 0;
  }, [inspections]);

  return (
    <>
      <PageHeader title="Inspections" description={`Pass rate ${passRate}% across submitted inspections`} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4"><TabsList>{tabs.map((t) => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}</TabsList></Tabs>
      {list.length === 0 ? <EmptyState icon={ClipboardCheck} title="No inspections here" /> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => (
            <li key={i.id}>
              <Link to="/inspections/$id" params={{ id: i.id }} className="surface block h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between"><IdTag>{i.id} · {i.workOrderId}</IdTag><StatusBadge value={i.status} /></div>
                <p className="mt-1.5 font-semibold">{i.title}</p>
                <p className="text-sm text-muted-foreground">{i.locationLabel}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{i.inspector} · {fmtDateTime(i.submittedAt ?? i.scheduledFor)}</span><SyncFlag status={i.syncStatus} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
