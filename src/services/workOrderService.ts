import { appStore } from "@/store/appStore";
import { crews } from "@/data/seed";
import type { FieldJob, WorkOrder, WorkOrderStatus } from "@/types";
import { nowIso } from "@/utils/format";
import { logActivity, recordChange, simulateLatency } from "./core";
import { apiRequest, remoteApiEnabled } from "./apiClient";

/** Future: GET/POST/PATCH /api/work-orders */
export const workOrderService = {
  async list(): Promise<WorkOrder[]> {
    if (remoteApiEnabled && appStore.getState().online) {
      const workOrders = await apiRequest<WorkOrder[]>("/api/work-orders");
      appStore.setState(() => ({ workOrders }));
      return workOrders;
    }
    await simulateLatency();
    return appStore.getState().workOrders;
  },
  async get(id: string) {
    if (remoteApiEnabled && appStore.getState().online) {
      return await apiRequest<WorkOrder>(`/api/work-orders/${id}`);
    }
    await simulateLatency();
    return appStore.getState().workOrders.find((w) => w.id === id) ?? null;
  },
  async updateStatus(id: string, status: WorkOrderStatus) {
    if (remoteApiEnabled && appStore.getState().online) {
      const updated = await apiRequest<WorkOrder>(`/api/work-orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      appStore.setState((s) => ({
        workOrders: s.workOrders.map((workOrder) => (workOrder.id === id ? updated : workOrder)),
      }));
      const verb = status === "Completed" ? "Supervisor approved" : `Status set to ${status} for`;
      logActivity({
        message: `${verb} #${id}`,
        workOrderId: id,
        tone: status === "Completed" ? "success" : "info",
      });
      return;
    }
    await simulateLatency();
    patchWorkOrder(id, { status });
    const verb = status === "Completed" ? "Supervisor approved" : `Status set to ${status} for`;
    logActivity({
      message: `${verb} #${id}`,
      workOrderId: id,
      tone: status === "Completed" ? "success" : "info",
    });
  },
  async toggleChecklistItem(id: string, itemId: string) {
    const wo = appStore.getState().workOrders.find((w) => w.id === id);
    if (!wo) return;
    const checklist = wo.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c));
    if (remoteApiEnabled && appStore.getState().online) {
      await apiRequest(`/api/work-orders/${id}/checklist/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ done: checklist.find((item) => item.id === itemId)?.done }),
      });
    }
    patchWorkOrder(id, { checklist });
    recordChange("Job", id, `Checklist item ${itemId} on ${id}`, "update", {
      kind: "checklist",
      itemId,
      done: checklist.find((item) => item.id === itemId)?.done,
    });
  },
  async addNote(id: string, text: string) {
    if (remoteApiEnabled && appStore.getState().online) {
      await apiRequest("/api/notes", {
        method: "POST",
        body: JSON.stringify({ workOrderId: id, text }),
      });
      logActivity({ message: `Note: ${text}`, workOrderId: id });
      return;
    }
    await simulateLatency();
    logActivity({ message: `Note: ${text}`, workOrderId: id });
    recordChange("Note", globalThis.crypto.randomUUID(), `Note on ${id}`, "create", {
      workOrderId: id,
      text,
    });
  },
};

function patchWorkOrder(id: string, patch: Partial<WorkOrder>) {
  appStore.setState((s) => ({
    workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  }));
}

function patchJob(id: string, patch: Partial<FieldJob>) {
  appStore.setState((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }));
}

const crewName = (crewId: string) => crews.find((c) => c.id === crewId)?.name ?? crewId;

/** Future: /api/field-jobs/:id/start|pause|complete */
export const fieldJobService = {
  async start(jobId: string) {
    if (remoteApiEnabled && appStore.getState().online) {
      const updated = await apiRequest<FieldJob>(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "In Progress" }),
      });
      patchJob(jobId, updated);
      const wo = appStore.getState().workOrders.find((w) => w.id === updated.workOrderId);
      if (wo && wo.status === "Assigned") patchWorkOrder(wo.id, { status: "In Progress" });
      return;
    }
    await simulateLatency();
    const job = appStore.getState().jobs.find((j) => j.id === jobId);
    if (!job) return;
    const syncStatus = recordChange("Job", jobId, `Job ${jobId} started`, "update", {
      status: "In Progress",
    });
    patchJob(jobId, { status: "In Progress", startedAt: job.startedAt ?? nowIso(), syncStatus });
    const wo = appStore.getState().workOrders.find((w) => w.id === job.workOrderId);
    if (wo && wo.status === "Assigned") patchWorkOrder(wo.id, { status: "In Progress" });
    logActivity({
      actor: crewName(job.crewId),
      message: `${crewName(job.crewId)} started Work Order #${job.workOrderId}`,
      workOrderId: job.workOrderId,
      tone: "info",
    });
  },
  async pause(jobId: string) {
    if (remoteApiEnabled && appStore.getState().online) {
      const updated = await apiRequest<FieldJob>(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Paused" }),
      });
      patchJob(jobId, updated);
      return;
    }
    await simulateLatency();
    const job = appStore.getState().jobs.find((j) => j.id === jobId);
    if (!job) return;
    const syncStatus = recordChange("Job", jobId, `Job ${jobId} paused`, "update", {
      status: "Paused",
    });
    patchJob(jobId, { status: "Paused", syncStatus });
    logActivity({ message: `Job ${jobId} paused`, workOrderId: job.workOrderId, tone: "warning" });
  },
  async complete(jobId: string) {
    if (remoteApiEnabled && appStore.getState().online) {
      const updated = await apiRequest<FieldJob>(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Completed" }),
      });
      patchJob(jobId, updated);
      patchWorkOrder(updated.workOrderId, { status: "Awaiting Review" });
      return;
    }
    await simulateLatency();
    const job = appStore.getState().jobs.find((j) => j.id === jobId);
    if (!job) return;
    const syncStatus = recordChange("Job", jobId, `Job ${jobId} completed`, "update", {
      status: "Completed",
    });
    patchJob(jobId, { status: "Completed", completedAt: nowIso(), syncStatus });
    patchWorkOrder(job.workOrderId, { status: "Awaiting Review" });
    logActivity({
      message: `Job ${jobId} completed — #${job.workOrderId} sent for review`,
      workOrderId: job.workOrderId,
      tone: "success",
    });
  },
};
