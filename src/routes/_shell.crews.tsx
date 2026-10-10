import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Truck } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { SectionGuard } from "@/components/layout/SectionGuard";
import { crewService } from "@/services";
import { useAppStore } from "@/store/appStore";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_shell/crews")({
  head: () => pageMeta("Crews", "Crew members, assignments, hours and locations."),
  component: () => (
    <SectionGuard section="crews">
      <CrewsPage />
    </SectionGuard>
  ),
});

function CrewsPage() {
  const workOrders = useAppStore((s) => s.workOrders);
  const list = crewService.list();
  return (
    <>
      <PageHeader title="Crews" description={`${list.length} crews · ${list.reduce((a, c) => a + c.members.length, 0)} field staff`} />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const wo = workOrders.find((w) => w.id === c.currentWorkOrderId);
          return (
            <li key={c.id} className="surface flex flex-col">
              <div className="flex items-center gap-3 border-b p-4">
                <span className="grid size-11 place-items-center rounded-md bg-primary font-mono font-bold text-primary-foreground">{c.id.slice(3)}</span>
                <div className="flex-1"><p className="font-semibold">{c.name}</p><p className="text-sm text-muted-foreground">{c.specialty}</p></div>
                <StatusBadge value={c.status} />
              </div>
              <div className="flex-1 space-y-3 p-4 text-sm">
                <div><p className="eyebrow">Current assignment</p>
                  {wo ? <Link to="/work-orders/$id" params={{ id: wo.id }} className="font-medium text-primary hover:underline">{wo.title}</Link> : <p className="text-muted-foreground">No active assignment</p>}
                </div>
                <div><p className="eyebrow mb-1">Members</p>
                  <ul className="space-y-1">{c.members.map((m) => <li key={m.userId} className="flex justify-between"><span>{m.name}</span><span className="text-muted-foreground">{m.position}</span></li>)}</ul>
                </div>
                <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-4" />{c.locationLabel}</p>
                <p className="flex items-center gap-1.5 text-muted-foreground"><Truck className="size-4" />{c.vehicle}</p>
              </div>
              <dl className="grid grid-cols-2 border-t text-center">
                <div className="border-r p-3"><dt className="eyebrow">Jobs completed</dt><dd className="font-mono text-xl font-semibold">{c.completedJobs}</dd></div>
                <div className="p-3"><dt className="eyebrow flex items-center justify-center gap-1"><Clock className="size-3" />Hours this week</dt><dd className="font-mono text-xl font-semibold">{c.hoursThisWeek}</dd></div>
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}
