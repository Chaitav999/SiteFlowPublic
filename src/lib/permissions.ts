import type { Role } from "@/types";

export type Section =
  | "dashboard"
  | "workOrders"
  | "jobs"
  | "inspections"
  | "deficiencies"
  | "crews"
  | "reports"
  | "map"
  | "sync"
  | "settings"
  | "users";

export type Capability = "approveWork" | "assignCrews" | "verifyDeficiency" | "exportReports" | "manageUsers";

const sectionAccess: Record<Role, Section[]> = {
  field_worker: ["dashboard", "jobs", "inspections", "deficiencies", "workOrders", "map", "sync", "settings"],
  supervisor: ["dashboard", "workOrders", "jobs", "inspections", "deficiencies", "crews", "reports", "map", "sync", "settings"],
  admin: ["dashboard", "workOrders", "jobs", "inspections", "deficiencies", "crews", "reports", "map", "sync", "settings", "users"],
};

const capabilities: Record<Role, Capability[]> = {
  field_worker: [],
  supervisor: ["approveWork", "assignCrews", "verifyDeficiency", "exportReports"],
  admin: ["approveWork", "assignCrews", "verifyDeficiency", "exportReports", "manageUsers"],
};

/** UI-level gating only. The future API must enforce the same rules server-side. */
export const canView = (role: Role, s: Section) => sectionAccess[role].includes(s);
export const can = (role: Role, c: Capability) => capabilities[role].includes(c);

export const roleLabel: Record<Role, string> = {
  field_worker: "Field Worker",
  supervisor: "Supervisor",
  admin: "Administrator",
};

export const permissionMatrix = { sectionAccess, capabilities };
