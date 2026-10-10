import { appStore } from "@/store/appStore";
import type { SyncEntityType, SyncItem } from "@/types";
import { nowIso } from "@/utils/format";
import { apiRequest, remoteApiEnabled } from "./apiClient";
import { pushNotification, simulateLatency } from "./core";

function setItem(id: string, patch: Partial<SyncItem>) {
  appStore.setState((s) => ({
    syncQueue: s.syncQueue.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function markEntitySynced(item: SyncItem) {
  switch (item.entityType) {
    case "Inspection":
      appStore.setState((s) => ({
        inspections: s.inspections.map((entity) =>
          entity.id === item.entityId ? { ...entity, syncStatus: "synced" } : entity,
        ),
      }));
      break;
    case "Deficiency":
      appStore.setState((s) => ({
        deficiencies: s.deficiencies.map((entity) =>
          entity.id === item.entityId ? { ...entity, syncStatus: "synced" } : entity,
        ),
      }));
      break;
    case "Photo":
      appStore.setState((s) => ({
        photos: s.photos.map((entity) =>
          entity.id === item.entityId ? { ...entity, syncStatus: "synced" } : entity,
        ),
      }));
      break;
    case "Measurement":
      appStore.setState((s) => ({
        measurements: s.measurements.map((entity) =>
          entity.id === item.entityId ? { ...entity, syncStatus: "synced" } : entity,
        ),
      }));
      break;
    case "Job":
      appStore.setState((s) => ({
        jobs: s.jobs.map((entity) =>
          entity.id === item.entityId ? { ...entity, syncStatus: "synced" } : entity,
        ),
      }));
      break;
    default:
      break;
  }
}

function objectPayload(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("The queued change has no valid payload.");
  }
  return payload as Record<string, unknown>;
}

async function replayRemoteItem(item: SyncItem) {
  const payload = objectPayload(item.payload);
  const body = JSON.stringify(payload);

  switch (item.entityType) {
    case "Inspection":
      return apiRequest(
        `/api/inspections/${item.entityId}${payload.submit === true ? "/submit" : ""}`,
        {
          method: payload.submit === true ? "POST" : "PATCH",
          body,
        },
      );
    case "Deficiency":
      if (item.action === "create") {
        return apiRequest("/api/deficiencies", { method: "POST", body });
      }
      if (typeof payload.status === "string") {
        return apiRequest(`/api/deficiencies/${item.entityId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: payload.status, note: payload.note }),
        });
      }
      return apiRequest(`/api/deficiencies/${item.entityId}`, { method: "PATCH", body });
    case "Photo":
      if (item.action === "delete") {
        return apiRequest(`/api/photos/${item.entityId}`, { method: "DELETE" });
      }
      if (item.action === "create") {
        return apiRequest("/api/photos", { method: "POST", body });
      }
      return apiRequest(`/api/photos/${item.entityId}/caption`, {
        method: "PATCH",
        body: JSON.stringify({ caption: payload.caption }),
      });
    case "Measurement":
      return apiRequest("/api/measurements", { method: "POST", body });
    case "Job":
      if (payload.kind === "checklist") {
        return apiRequest(`/api/work-orders/${item.entityId}/checklist/${String(payload.itemId)}`, {
          method: "PATCH",
          body: JSON.stringify({ done: payload.done }),
        });
      }
      return apiRequest(`/api/jobs/${item.entityId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: payload.status }),
      });
    case "Note":
      return apiRequest("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          id: item.entityId,
          workOrderId: payload.workOrderId,
          text: payload.text,
        }),
      });
    default:
      throw new Error(`Unsupported offline entity: ${item.entityType}`);
  }
}

async function recordRemoteOperation(item: SyncItem, status: SyncItem["status"], error?: string) {
  const idempotencyKey = item.idempotencyKey ?? globalThis.crypto.randomUUID();
  setItem(item.id, { idempotencyKey });
  await apiRequest("/api/sync/operations", {
    method: "POST",
    body: JSON.stringify([
      {
        idempotencyKey,
        entityType: item.entityType,
        entityId: item.entityId,
        label: item.label,
        action: item.action,
        status,
        ...(error ? { error } : {}),
      },
    ]),
  });
}

/**
 * Offline changes are kept locally. In Supabase mode they are replayed through
 * the same authenticated REST routes used by online writes; demo mode retains
 * its simulated sync behavior.
 */
export const syncService = {
  setOnline(online: boolean) {
    appStore.setState(() => ({ online }));
  },
  pendingItems(): SyncItem[] {
    return appStore
      .getState()
      .syncQueue.filter((item) => item.status === "Queued" || item.status === "Failed");
  },
  async syncAll(): Promise<{ synced: number; failed: number }> {
    if (!appStore.getState().online) throw new Error("Cannot sync while offline");
    const items = this.pendingItems();
    let synced = 0;
    let failed = 0;
    items.forEach((item) => setItem(item.id, { status: "Queued", error: undefined }));
    for (const item of items) {
      setItem(item.id, { status: "Uploading" });
      if (remoteApiEnabled) {
        try {
          await replayRemoteItem(item);
          await recordRemoteOperation(item, "Synced");
          setItem(item.id, { status: "Synced", error: undefined });
          markEntitySynced(item);
          synced++;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Could not synchronize this change.";
          setItem(item.id, { status: "Failed", error: message });
          try {
            await recordRemoteOperation(item, "Failed", message);
          } catch (recordError) {
            console.error("Could not record the failed sync operation:", recordError);
          }
          failed++;
        }
        continue;
      }

      await simulateLatency(650);
      const fail = appStore.getState().simulateSyncFailures && Math.random() < 0.35;
      if (fail) {
        setItem(item.id, { status: "Failed", error: "Server timeout (504). Will retry." });
        failed++;
      } else {
        setItem(item.id, { status: "Synced" });
        markEntitySynced(item);
        synced++;
      }
    }
    appStore.setState(() => ({ lastSyncedAt: nowIso() }));
    if (synced > 0) {
      pushNotification({
        title: "Sync complete",
        body: `${synced} record${synced === 1 ? "" : "s"} synchronized successfully.`,
        tone: "success",
        link: { kind: "sync" },
      });
    }
    return { synced, failed };
  },
  clearSynced() {
    appStore.setState((s) => ({
      syncQueue: s.syncQueue.filter((item) => item.status !== "Synced"),
    }));
  },
};
