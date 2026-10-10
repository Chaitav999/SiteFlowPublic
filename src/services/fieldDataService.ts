import { appStore } from "@/store/appStore";
import type {
  Deficiency,
  DeficiencyStatus,
  Inspection,
  LocationEvidence,
  Measurement,
  PhotoCategory,
  PhotoEvidence,
  Priority,
} from "@/types";
import { nowIso } from "@/utils/format";
import {
  currentUser,
  localEntityId,
  logActivity,
  pushNotification,
  recordChange,
  simulateLatency,
} from "./core";
import { apiRequest, remoteApiEnabled } from "./apiClient";

/** Decide inspection outcome from answers — mirrors a future server rule. */
export function evaluateInspection(answers: Record<string, string>): "Passed" | "Failed" {
  const bad = ["Poor", "Critical"];
  if (Object.values(answers).some((v) => bad.includes(v))) return "Failed";
  if (answers.damage === "Yes" || answers.hazard === "Yes" || answers.blocked === "Yes")
    return "Failed";
  return "Passed";
}

/** Future: GET/POST /api/inspections */
export const inspectionService = {
  async save(id: string, patch: Partial<Inspection>, submit = false) {
    if (remoteApiEnabled && appStore.getState().online) {
      const payload = {
        ...(patch.answers !== undefined ? { answers: patch.answers } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.measurements !== undefined ? { measurements: patch.measurements } : {}),
        ...(patch.locationEvidence !== undefined
          ? { locationEvidence: patch.locationEvidence }
          : {}),
      };
      const updated = await apiRequest<Inspection>(
        submit ? `/api/inspections/${id}/submit` : `/api/inspections/${id}`,
        { method: submit ? "POST" : "PATCH", body: JSON.stringify(payload) },
      );
      appStore.setState((s) => ({
        inspections: s.inspections.map((item) => (item.id === id ? updated : item)),
      }));
      if (submit) {
        logActivity({
          message: `Inspection #${id} completed — ${updated.status === "Passed" ? "passed" : "action required"}`,
          workOrderId: updated.workOrderId,
          tone: updated.status === "Passed" ? "success" : "warning",
        });
      }
      return updated.status;
    }
    await simulateLatency(400);
    const current = appStore.getState().inspections.find((i) => i.id === id);
    if (!current) throw new Error("Inspection not found");
    const merged = { ...current, ...patch };
    const status = submit ? evaluateInspection(merged.answers) : "In Progress";
    const syncStatus = recordChange("Inspection", id, `Inspection ${id}`, "update", {
      answers: merged.answers,
      notes: merged.notes,
      measurements: merged.measurements,
      locationEvidence: merged.locationEvidence,
      submit,
    });
    appStore.setState((s) => ({
      inspections: s.inspections.map((i) =>
        i.id === id
          ? { ...merged, status, submittedAt: submit ? nowIso() : i.submittedAt, syncStatus }
          : i,
      ),
    }));
    if (submit) {
      logActivity({
        message: `Inspection #${id} completed — ${status === "Passed" ? "passed" : "action required"}`,
        workOrderId: current.workOrderId,
        tone: status === "Passed" ? "success" : "warning",
      });
    }
    return status;
  },
};

export interface NewDeficiencyInput {
  title: string;
  description: string;
  category: string;
  severity: Priority;
  highway: string;
  locationLabel: string;
  location: LocationEvidence;
  workOrderId?: string;
  inspectionId?: string;
}

/** Future: GET/POST/PATCH /api/deficiencies */
export const deficiencyService = {
  async create(input: NewDeficiencyInput): Promise<Deficiency> {
    if (remoteApiEnabled && appStore.getState().online) {
      const id = localEntityId("DEF", appStore.getState().deficiencies);
      const deficiency = await apiRequest<Deficiency>("/api/deficiencies", {
        method: "POST",
        body: JSON.stringify({ ...input, id }),
      });
      appStore.setState((s) => ({ deficiencies: [deficiency, ...s.deficiencies] }));
      return deficiency;
    }
    await simulateLatency(350);
    const user = currentUser();
    const id = localEntityId("DEF", appStore.getState().deficiencies);
    const at = nowIso();
    const deficiency: Deficiency = {
      ...input,
      id,
      status: "Open",
      reportedBy: user.name,
      reportedAt: at,
      history: [{ status: "Open", at, by: user.name }],
      syncStatus: "pending",
    };
    const syncStatus = recordChange("Deficiency", id, `Deficiency ${id}`, "create", deficiency);
    deficiency.syncStatus = syncStatus;
    appStore.setState((s) => ({ deficiencies: [deficiency, ...s.deficiencies] }));
    logActivity({
      message: `${user.name.split(" ")[0]} reported ${input.title.toLowerCase()}`,
      workOrderId: input.workOrderId,
      tone: input.severity === "Critical" ? "critical" : "warning",
    });
    if (input.severity === "Critical" || input.severity === "High") {
      pushNotification({
        title: `${input.severity} deficiency reported`,
        body: `${id} ${input.title} — ${input.locationLabel}`,
        tone: input.severity === "Critical" ? "critical" : "warning",
        link: { kind: "deficiency", id },
      });
    }
    return deficiency;
  },
  async updateStatus(id: string, status: DeficiencyStatus, note?: string) {
    if (remoteApiEnabled && appStore.getState().online) {
      const updated = await apiRequest<Deficiency>(`/api/deficiencies/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      });
      appStore.setState((s) => ({
        deficiencies: s.deficiencies.map((item) => (item.id === id ? updated : item)),
      }));
      return;
    }
    await simulateLatency();
    const by = currentUser().name;
    const syncStatus = recordChange("Deficiency", id, `Deficiency ${id}`, "update", {
      status,
      note,
    });
    appStore.setState((s) => ({
      deficiencies: s.deficiencies.map((d) =>
        d.id === id
          ? {
              ...d,
              status,
              syncStatus,
              resolutionNotes: status === "Resolved" && note ? note : d.resolutionNotes,
              history: [...d.history, { status, at: nowIso(), by, note }],
            }
          : d,
      ),
    }));
    logActivity({
      message: `Deficiency ${id} moved to ${status}`,
      tone: status === "Verified" || status === "Resolved" ? "success" : "info",
    });
  },
  async update(
    id: string,
    patch: Partial<Pick<Deficiency, "assignedCrewId" | "dueDate" | "resolutionNotes">>,
  ) {
    if (remoteApiEnabled && appStore.getState().online) {
      const updated = await apiRequest<Deficiency>(`/api/deficiencies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      appStore.setState((s) => ({
        deficiencies: s.deficiencies.map((item) => (item.id === id ? updated : item)),
      }));
      return;
    }
    await simulateLatency();
    const syncStatus = recordChange("Deficiency", id, `Deficiency ${id}`, "update", patch);
    appStore.setState((s) => ({
      deficiencies: s.deficiencies.map((d) => (d.id === id ? { ...d, ...patch, syncStatus } : d)),
    }));
  },
};

export interface NewPhotoInput {
  url: string;
  caption: string;
  category: PhotoCategory;
  workOrderId: string;
  deficiencyId?: string;
  inspectionId?: string;
  location: LocationEvidence;
}

/** Future: POST /api/photos (multipart) */
export const photoService = {
  async add(input: NewPhotoInput): Promise<PhotoEvidence> {
    if (remoteApiEnabled && appStore.getState().online) {
      const id = localEntityId("IMG", appStore.getState().photos, 3021);
      const photo = await apiRequest<PhotoEvidence>("/api/photos", {
        method: "POST",
        body: JSON.stringify({ ...input, id }),
      });
      appStore.setState((s) => ({ photos: [photo, ...s.photos] }));
      return photo;
    }
    await simulateLatency(400);
    const id = localEntityId("IMG", appStore.getState().photos, 3021);
    const photo: PhotoEvidence = {
      ...input,
      id,
      takenAt: nowIso(),
      uploader: currentUser().name,
      syncStatus: "pending",
    };
    const syncStatus = recordChange("Photo", id, `Photo ${id}`, "create", photo);
    photo.syncStatus = syncStatus;
    appStore.setState((s) => ({ photos: [photo, ...s.photos] }));
    logActivity({ message: `Photo evidence uploaded (${id})`, workOrderId: input.workOrderId });
    return photo;
  },
  async remove(id: string) {
    if (remoteApiEnabled && appStore.getState().online) {
      await apiRequest(`/api/photos/${id}`, { method: "DELETE" });
      appStore.setState((s) => ({ photos: s.photos.filter((photo) => photo.id !== id) }));
      return;
    }
    await simulateLatency(150);
    recordChange("Photo", id, `Photo ${id} removed`, "delete", { id });
    appStore.setState((s) => ({ photos: s.photos.filter((p) => p.id !== id) }));
  },
  async updateCaption(id: string, caption: string) {
    if (remoteApiEnabled && appStore.getState().online) {
      const updated = await apiRequest<PhotoEvidence>(`/api/photos/${id}/caption`, {
        method: "PATCH",
        body: JSON.stringify({ caption }),
      });
      appStore.setState((s) => ({
        photos: s.photos.map((photo) => (photo.id === id ? updated : photo)),
      }));
      return;
    }
    const syncStatus = recordChange("Photo", id, `Photo ${id}`, "update", { caption });
    appStore.setState((s) => ({
      photos: s.photos.map((p) => (p.id === id ? { ...p, caption, syncStatus } : p)),
    }));
  },
};

export type NewMeasurementInput = Omit<
  Measurement,
  "id" | "recordedBy" | "recordedAt" | "syncStatus"
>;

/** Future: POST /api/measurements */
export const measurementService = {
  async create(input: NewMeasurementInput): Promise<Measurement> {
    if (remoteApiEnabled && appStore.getState().online) {
      const id = localEntityId("MES", appStore.getState().measurements, 912);
      const measurement = await apiRequest<Measurement>("/api/measurements", {
        method: "POST",
        body: JSON.stringify({ ...input, id }),
      });
      appStore.setState((s) => ({ measurements: [measurement, ...s.measurements] }));
      return measurement;
    }
    await simulateLatency(300);
    const id = localEntityId("MES", appStore.getState().measurements, 912);
    const m: Measurement = {
      ...input,
      id,
      recordedBy: currentUser().name,
      recordedAt: nowIso(),
      syncStatus: "pending",
    };
    const syncStatus = recordChange("Measurement", id, `Measurement ${id}`, "create", m);
    m.syncStatus = syncStatus;
    appStore.setState((s) => ({ measurements: [m, ...s.measurements] }));
    logActivity({
      message: `Measurement recorded: ${input.kind} ${input.value} ${input.unit}`,
      workOrderId: input.workOrderId,
    });
    return m;
  },
};
