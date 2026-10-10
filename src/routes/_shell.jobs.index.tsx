import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Clock, HardHat, MapPin } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge, SyncFlag } from "@/components/app/primitives";
import { useAppStore } from "@/store/appStore";
import { crews } from "@/data/seed";
import { useSession } from "@/hooks/useSession";
import { pageMeta } from "@/lib/meta";
import { fmtTime, fmtWeekday } from "@/utils/format";

export const Route = createFileRoute("/_shell/jobs/")({
  head: () =>
    pageMeta("Today's Field Jobs", "Mobile-first list of today's field jobs for each crew."),
  component: JobsPage,
});

function JobsPage() {
  const { user, role } = useSession();
  const jobs = useAppStore((s) => s.jobs);
  const workOrders = useAppStore((s) => s.workOrders);
  const mine = role === "field_worker";
  const list = useMemo(
    () =>
      [...jobs]
        .filter(
          (job) =>
            !mine ||
            job.crewId === user.crewId ||
            job.assignedUserIds?.includes(user.id) ||
            workOrders.some(
              (workOrder) => workOrder.id === job.workOrderId && workOrder.assignedTo === user.id,
            ),
        )
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [jobs, mine, user.crewId, user.id, workOrders],
  );
  const done = list.filter((j) => j.status === "Completed").length;
  const crewName = crews.find((c) => c.id === user.crewId)?.name;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={fmtWeekday("2026-10-08T12:00:00-07:00")}
        title="Today's jobs"
        description={
          mine
            ? `${crewName ?? "Assigned to you"} · ${done} of ${list.length} complete`
            : `All crews · ${done} of ${list.length} complete`
        }
      />
      <div
        className="mb-4 h-2 overflow-hidden rounded-full bg-muted"
        aria-label={`${done} of ${list.length} jobs complete`}
      >
        <div
          className="h-full bg-success transition-all"
          style={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={HardHat} title="No jobs scheduled today" />
      ) : (
        <ol className="space-y-3">
          {list.map((j, i) => {
            const wo = workOrders.find((w) => w.id === j.workOrderId)!;
            return (
              <li key={j.id}>
                <Link
                  to="/jobs/$id"
                  params={{ id: j.id }}
                  className="surface flex items-center gap-4 p-4 transition-shadow hover:shadow-md active:bg-accent"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-lg font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold leading-snug">{wo.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-4" />
                        {fmtTime(j.scheduledAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-4" />
                        {wo.highway} KM {wo.km}
                      </span>
                      <span>{crews.find((c) => c.id === j.crewId)?.name}</span>
                    </p>
                    <div className="mt-2 flex gap-2">
                      <StatusBadge value={j.status} />
                      <SyncFlag status={j.syncStatus} />
                    </div>
                  </div>
                  <ChevronRight className="size-6 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
