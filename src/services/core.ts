import { appStore } from "@/store/appStore";
import { demoUserByRole, users } from "@/data/seed";
import type {
  ActivityEvent,
  GeoPoint,
  LocationEvidence,
  Notification,
  SyncEntityType,
  Tone,
} from "@/types";
import { nextId, nowIso } from "@/utils/format";
import { remoteApiEnabled } from "./apiClient";

/**
 * Shared helpers for mock services.
 *
 * Swapping to a real backend: replace `simulateLatency` + store writes inside
 * each service with `apiClient.get/post/patch` calls (e.g. fetch to
 * `${import.meta.env.VITE_API_URL}/api/work-orders`). Components never touch
 * the store directly for writes, so they will not need to change.
 */
export const simulateLatency = (ms = 250) => new Promise<void>((r) => setTimeout(r, ms));

export function localEntityId(prefix: string, items: { id: string }[], start = 0) {
  if (remoteApiEnabled) return globalThis.crypto.randomUUID();
  return nextId(prefix, items, start);
}

export function currentUser() {
  const sessionUser = appStore.getState().sessionUser;
  if (sessionUser) return sessionUser;
  const role = appStore.getState().role ?? "supervisor";
  return users.find((u) => u.id === demoUserByRole[role])!;
}

export function logActivity(e: Omit<ActivityEvent, "id" | "at" | "actor"> & { actor?: string }) {
  appStore.setState((s) => ({
    activity: [
      { id: nextId("EV", s.activity), at: nowIso(), actor: e.actor ?? currentUser().name, ...e },
      ...s.activity,
    ],
  }));
}

export function pushNotification(n: {
  title: string;
  body: string;
  tone: Tone;
  link?: Notification["link"];
}) {
  appStore.setState((s) => ({
    notifications: [
      { id: nextId("N", s.notifications), at: nowIso(), read: false, ...n },
      ...s.notifications,
    ],
  }));
}

/**
 * Offline-first write path. Online: the change is considered persisted.
 * Offline: the change is saved locally and an outbox entry is queued.
 */
export function recordChange(
  entityType: SyncEntityType,
  entityId: string,
  label: string,
  action: "create" | "update" | "delete" = "create",
  payload?: unknown,
) {
  const { online, syncQueue } = appStore.getState();
  if (online) return "synced" as const;
  const existing = syncQueue.find((i) => i.entityId === entityId && i.status !== "Synced");
  if (existing) {
    appStore.setState((s) => ({
      syncQueue: s.syncQueue.map((item) =>
        item.id === existing.id
          ? { ...item, payload, label, error: undefined, status: "Queued" }
          : item,
      ),
    }));
  } else {
    appStore.setState((s) => ({
      syncQueue: [
        {
          id: nextId("SYN", s.syncQueue),
          idempotencyKey: globalThis.crypto?.randomUUID?.(),
          entityType,
          entityId,
          label,
          action,
          createdAt: nowIso(),
          status: "Queued",
          payload,
        },
        ...s.syncQueue,
      ],
    }));
  }
  return "pending" as const;
}

/** Simulated GNSS fix near a known point (no device API required). */
export async function captureLocation(near: GeoPoint): Promise<LocationEvidence> {
  await simulateLatency(900);
  const jitter = () => (Math.random() - 0.5) * 0.0008;
  return {
    lat: +(near.lat + jitter()).toFixed(6),
    lng: +(near.lng + jitter()).toFixed(6),
    accuracy: Math.round(4 + Math.random() * 8),
    capturedAt: nowIso(),
  };
}
