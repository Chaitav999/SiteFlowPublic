import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CloudOff, CloudUpload, Loader2, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState, IdTag, PageHeader, Panel, StatusBadge, TimeAgo } from "@/components/app/primitives";
import { ConnectionToggle } from "@/components/layout/AppChrome";
import { useAppStore } from "@/store/appStore";
import { syncService } from "@/services";
import { usePendingSyncCount } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/_shell/sync")({
  head: () => pageMeta("Sync Center", "Offline changes waiting to sync, with upload progress and retry."),
  component: SyncCenter,
});

function SyncCenter() {
  const online = useAppStore((s) => s.online);
  const queue = useAppStore((s) => s.syncQueue);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const pending = usePendingSyncCount();
  const [running, setRunning] = useState(false);
  const [batch, setBatch] = useState(0);

  const synced = queue.filter((i) => i.status === "Synced").length;
  const active = queue.filter((i) => i.status !== "Synced").length;
  const progress = batch ? Math.round(((batch - pending) / batch) * 100) : 0;

  const syncNow = async () => {
    setBatch(pending);
    setRunning(true);
    const res = await syncService.syncAll();
    setRunning(false);
    if (res.failed) toast.error(`${res.synced} synced, ${res.failed} failed`, { description: "Failed items will retry on the next sync." });
    else toast.success(`${res.synced} records synchronized successfully.`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Sync Center" description="Field changes are saved on this device first, then uploaded when a connection is available." />
      <section className={cn("surface mb-4 overflow-hidden", online ? "border-success/30" : "border-warning/40")}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className={cn("grid size-14 shrink-0 place-items-center rounded-full", online ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{online ? <Wifi className="size-7" /> : <WifiOff className="size-7" />}</span>
          <div className="flex-1">
            <p className="eyebrow">Pending changes</p>
            <p className="font-mono text-4xl font-semibold">{pending}</p>
            <p className="text-sm text-muted-foreground">
              {!online ? "You're offline. Your changes are saved locally and will sync when connection returns."
                : pending > 0 ? `${pending} change${pending === 1 ? "" : "s"} ready to sync`
                : "Everything is up to date."}
              {lastSyncedAt && <> · Last sync <TimeAgo iso={lastSyncedAt} /></>}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <ConnectionToggle />
            <Button size="lg" className="h-14 px-8 text-base font-semibold" disabled={!online || pending === 0 || running} onClick={syncNow}>
              {running ? <Loader2 className="animate-spin" /> : <RefreshCw />}SYNC NOW
            </Button>
          </div>
        </div>
        {running && <div className="border-t px-5 py-3"><Progress value={progress} aria-label="Sync progress" /><p className="mt-1 text-xs text-muted-foreground">Uploading… {progress}%</p></div>}
      </section>

      <Panel title={`Outbox · ${active} active · ${synced} synced`} action={synced > 0 && <Button variant="ghost" size="sm" onClick={() => syncService.clearSynced()}><Trash2 />Clear synced</Button>} bodyClassName="p-0">
        {queue.length === 0 ? (
          <div className="p-4"><EmptyState icon={CloudOff} title="No queued changes" body="Switch to Offline in the header, then record an inspection, photo, measurement or deficiency. It will appear here." /></div>
        ) : (
          <ul className="divide-y">
            {queue.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-9 place-items-center rounded-md bg-muted">
                  {i.status === "Uploading" ? <Loader2 className="size-4 animate-spin text-info" /> : i.status === "Synced" ? <CheckCircle2 className="size-4 text-success" /> : <CloudUpload className="size-4 text-muted-foreground" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.label}</p>
                  <p className="text-xs text-muted-foreground"><IdTag>{i.id}</IdTag> · {i.entityType} · {i.action} · <TimeAgo iso={i.createdAt} />{i.error && <span className="text-critical"> · {i.error}</span>}</p>
                </div>
                <StatusBadge value={i.status} label={i.status === "Queued" ? "Waiting to sync" : i.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="How offline mode works" className="mt-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Every field write goes through a service that checks connectivity.</li>
          <li>Offline writes are stored on the device and added to this outbox.</li>
          <li>When back online, the outbox replays changes in order; failures stay queued for retry.</li>
        </ol>
      </Panel>
    </div>
  );
}
