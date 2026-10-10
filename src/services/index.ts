/**
 * Service layer barrel for demo and Supabase-backed service implementations.
 */
import { appStore, createSeedState } from "@/store/appStore";
import { apiRequest, remoteApiEnabled } from "./apiClient";
import { getRemoteUser, loadRemoteState } from "./remoteState";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Role } from "@/types";

export { workOrderService, fieldJobService } from "./workOrderService";
export {
  inspectionService,
  deficiencyService,
  photoService,
  measurementService,
  evaluateInspection,
} from "./fieldDataService";
export { syncService } from "./syncService";
export { reportService, reportCatalog } from "./reportService";
export { captureLocation, currentUser } from "./core";

export const crewService = {
  list: () => appStore.getState().crews,
  get: (id: string) => appStore.getState().crews.find((c) => c.id === id),
};

export const notificationService = {
  async markRead(id: string) {
    if (remoteApiEnabled && appStore.getState().online)
      await apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" });
    appStore.setState((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },
  async markAllRead() {
    if (remoteApiEnabled && appStore.getState().online)
      await apiRequest("/api/notifications/read-all", { method: "PATCH" });
    appStore.setState((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
};

export const sessionService = {
  signInAs(role: "field_worker" | "supervisor" | "admin") {
    if (supabaseConfigured) throw new Error("Choose email sign-in when Supabase is configured.");
    appStore.setState(() => ({ role, sessionReady: true }));
  },
  async signIn(email: string, password: string) {
    if (!supabase || !remoteApiEnabled)
      throw new Error("Set the Supabase public values and VITE_API_URL before signing in.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    try {
      const user = await getRemoteUser();
      await loadRemoteState();
      appStore.setState(() => ({ role: user.role, sessionUser: user, sessionReady: true }));
      return user;
    } catch (error) {
      await supabase.auth.signOut();
      appStore.setState(() => ({ ...createSeedState(), hydrated: true, sessionReady: true }));
      throw error;
    }
  },
  async signUp(name: string, email: string, password: string) {
    if (!supabase || !remoteApiEnabled)
      throw new Error(
        "Set the Supabase public values and VITE_API_URL before creating an account.",
      );
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      appStore.setState(() => ({ sessionReady: true }));
      return { confirmationRequired: true as const };
    }
    try {
      const user = await getRemoteUser();
      await loadRemoteState();
      appStore.setState(() => ({ role: user.role, sessionUser: user, sessionReady: true }));
      return { confirmationRequired: false as const, user };
    } catch (error) {
      await supabase.auth.signOut();
      appStore.setState(() => ({ role: null, sessionUser: undefined, sessionReady: true }));
      throw error;
    }
  },
  async restore() {
    if (!supabase) {
      appStore.setState(() => ({ sessionReady: true }));
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      appStore.setState(() => ({ ...createSeedState(), hydrated: true, sessionReady: true }));
      throw error;
    }
    if (!data.session) {
      appStore.setState(() => ({ ...createSeedState(), hydrated: true, sessionReady: true }));
      return;
    }
    try {
      const user = await getRemoteUser();
      await loadRemoteState();
      appStore.setState(() => ({ role: user.role, sessionUser: user, sessionReady: true }));
    } catch (restoreError) {
      await supabase.auth.signOut();
      appStore.setState(() => ({ ...createSeedState(), hydrated: true, sessionReady: true }));
      throw restoreError;
    }
  },
  async signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    appStore.setState(() => ({
      ...createSeedState(),
      hydrated: true,
      role: null,
      sessionReady: true,
    }));
  },
};
