import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DetailRow,
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
  SyncFlag,
  Timeline,
} from "@/components/app/primitives";
import { PhotoGallery } from "@/features/photos/PhotoGallery";
import { LocationEvidenceCard } from "@/features/location/LocationEvidenceCard";
import { useAppStore } from "@/store/appStore";
import { deficiencyService } from "@/services";
import { useSession } from "@/hooks/useSession";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";
import { fmtDate, fmtDateTime } from "@/utils/format";
import type { DeficiencyStatus } from "@/types";

export const Route = createFileRoute("/_shell/deficiencies/$id")({
  head: ({ params }) =>
    pageMeta(
      `Deficiency ${params.id}`,
      `Status, evidence and resolution for deficiency ${params.id}.`,
    ),
  component: DeficiencyDetail,
});

const flow: DeficiencyStatus[] = ["Open", "Assigned", "In Progress", "Resolved", "Verified"];

function DeficiencyDetail() {
  const { id } = Route.useParams();
  const { role } = useSession();
  const d = useAppStore((s) => s.deficiencies.find((x) => x.id === id));
  const crews = useAppStore((s) => s.crews);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  if (!d)
    return (
      <EmptyState
        icon={TriangleAlert}
        title={`Deficiency ${id} not found`}
        action={
          <Button asChild variant="outline">
            <Link to="/deficiencies">Back</Link>
          </Button>
        }
      />
    );

  const idx = flow.indexOf(d.status);
  const next = flow[idx + 1];
  const needsSupervisor = next === "Verified" || next === "Assigned";
  const allowed = next && (!needsSupervisor || can(role, "verifyDeficiency"));

  const advance = async () => {
    if (!next) return;
    if (next === "Resolved" && !notes.trim()) {
      toast.error("Add resolution notes before resolving");
      return;
    }
    setBusy(true);
    try {
      await deficiencyService.updateStatus(d.id, next, notes.trim() || undefined);
      setNotes("");
      toast.success(`${d.id} moved to ${next}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update deficiency status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link
        to="/deficiencies"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Deficiencies
      </Link>
      <PageHeader
        eyebrow={d.id}
        title={d.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={d.severity} label={`${d.severity} severity`} />
            <StatusBadge value={d.status} />
            {d.locationLabel}
            <SyncFlag status={d.syncStatus} />
          </span>
        }
      />

      <Panel className="mb-4">
        <ol className="grid grid-cols-5 gap-1" aria-label="Status progress">
          {flow.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === 0 ? "bg-transparent" : i <= idx ? "bg-success" : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                    i < idx
                      ? "border-success bg-success text-primary-foreground"
                      : i === idx
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground",
                  )}
                  aria-current={i === idx ? "step" : undefined}
                >
                  {i < idx ? <Check className="size-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === flow.length - 1 ? "bg-transparent" : i < idx ? "bg-success" : "bg-border",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs",
                  i === idx ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {s}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Panel title="Description">
            <p className="text-sm leading-relaxed">{d.description}</p>
          </Panel>
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <DetailRow label="Reported by">{d.reportedBy}</DetailRow>
              <DetailRow label="Reported">{fmtDateTime(d.reportedAt)}</DetailRow>
              <DetailRow label="Category">{d.category}</DetailRow>
              <DetailRow label="Related work order">
                {d.workOrderId ? (
                  <Link
                    to="/work-orders/$id"
                    params={{ id: d.workOrderId }}
                    className="font-mono text-primary hover:underline"
                  >
                    {d.workOrderId}
                  </Link>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Related inspection">
                {d.inspectionId ? (
                  <Link
                    to="/inspections/$id"
                    params={{ id: d.inspectionId }}
                    className="font-mono text-primary hover:underline"
                  >
                    {d.inspectionId}
                  </Link>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Due date">{d.dueDate ? fmtDate(d.dueDate) : "Not set"}</DetailRow>
              <DetailRow label="Assigned team">
                {can(role, "assignCrews") ? (
                  <Select
                    value={d.assignedCrewId ?? ""}
                    onValueChange={async (v) => {
                      try {
                        await deficiencyService.update(d.id, { assignedCrewId: v });
                        toast.success(
                          `Assigned to ${crews.find((c) => c.id === v)?.name ?? "crew"}`,
                        );
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not assign crew.",
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="h-9" aria-label="Assign crew">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {crews.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · {c.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  (crews.find((c) => c.id === d.assignedCrewId)?.name ?? "Unassigned")
                )}
              </DetailRow>
            </dl>
          </Panel>
          <Panel title="Photos">
            <PhotoGallery workOrderId={d.workOrderId} deficiencyId={d.id} near={d.location} />
          </Panel>
          <Panel title="GPS location">
            <LocationEvidenceCard value={d.location} near={d.location} />
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Resolution">
            {d.resolutionNotes && (
              <p className="mb-3 rounded-md bg-success/10 p-3 text-sm">{d.resolutionNotes}</p>
            )}
            {next ? (
              <>
                {next === "Resolved" && (
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe the fix (required)"
                    aria-label="Resolution notes"
                    className="mb-3"
                  />
                )}
                <Button className="h-12 w-full" disabled={!allowed || busy} onClick={advance}>
                  {busy && <Loader2 className="animate-spin" />}Move to {next}
                </Button>
                {!allowed && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Only supervisors can move a deficiency to {next}.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-success">Verified and closed.</p>
            )}
          </Panel>
          <Panel title="Status history">
            <Timeline
              items={[...d.history].reverse().map((h, i) => ({
                id: `${i}`,
                time: fmtDateTime(h.at),
                title: h.status,
                body: `${h.by}${h.note ? ` — ${h.note}` : ""}`,
                tone:
                  h.status === "Verified" || h.status === "Resolved"
                    ? "success"
                    : h.status === "Open"
                      ? "warning"
                      : "info",
              }))}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
