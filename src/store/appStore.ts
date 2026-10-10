import { useSyncExternalStore } from "react";
import * as seed from "@/data/seed";
import type {
  ActivityEvent,
  Crew,
  Deficiency,
  FieldJob,
  Inspection,
  Measurement,
  Notification,
  PhotoEvidence,
  Role,
  SyncItem,
  User,
  WorkOrder,
} from "@/types";

/**
 * Client-side data cache. In production this would be replaced by a query
 * cache over REST endpoints plus an IndexedDB outbox; for the demo it is a
 * tiny external store persisted to localStorage.
 */
export interface AppState {
  hydrated: boolean;
  role: Role | null;
  sessionReady: boolean;
  sessionUser?: User;
  crews: Crew[];
  online: boolean;
  simulateSyncFailures: boolean;
  lastSyncedAt?: string;
  workOrders: WorkOrder[];
  jobs: FieldJob[];
  inspections: Inspection[];
  deficiencies: Deficiency[];
  photos: PhotoEvidence[];
  measurements: Measurement[];
  syncQueue: SyncItem[];
  notifications: Notification[];
  activity: ActivityEvent[];
}

const STORAGE_KEY = "roadops:state:v1";
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function createSeedState(): AppState {
  return {
    hydrated: false,
    role: null,
    sessionReady: false,
    sessionUser: undefined,
    crews: clone(seed.crews),
    online: true,
    simulateSyncFailures: false,
    workOrders: clone(seed.workOrders),
    jobs: clone(seed.fieldJobs),
    inspections: clone(seed.inspections),
    deficiencies: clone(seed.deficiencies),
    photos: clone(seed.photos),
    measurements: clone(seed.measurements),
    syncQueue: [],
    notifications: clone(seed.notifications),
    activity: clone(seed.activity),
  };
}

const initialState = createSeedState();
let state: AppState = initialState;
const listeners = new Set<() => void>();

function persist() {
  if (!state.hydrated || typeof window === "undefined") return;
  try {
    const { hydrated: _h, ...rest } = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    // Storage quota exceeded (large photos) — keep working in memory.
  }
}

export const appStore = {
  getState: () => state,
  setState(updater: (s: AppState) => Partial<AppState>) {
    state = { ...state, ...updater(state) };
    persist();
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Call once on the client after mount. */
export function hydrateStore() {
  if (state.hydrated) return;
  let saved: Partial<AppState> = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    saved = {};
  }
  appStore.setState(() => ({ ...saved, hydrated: true }));
}

export function resetDemoData() {
  const { role, sessionUser } = state;
  appStore.setState(() => ({ ...createSeedState(), role, sessionUser, hydrated: true }));
}

/** Select a slice. Selectors must return existing references or primitives. */
export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    appStore.subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}
