/**
 * Domain model for siteFlow.
 * These interfaces mirror the future PostgreSQL schema / REST payloads so the
 * mock services can be swapped for real API clients without touching the UI.
 */

export type Role = "field_worker" | "supervisor" | "admin";

export interface User {
  id: string;
  name: string;
  initials: string;
  role: Role;
  title: string;
  crewId?: string;
  email: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface LocationEvidence extends GeoPoint {
  accuracy: number; // metres
  capturedAt: string; // ISO
}

/** Entities captured in the field carry a local sync flag for offline-first. */
export type SyncStatus = "synced" | "pending";

export interface CrewMember {
  userId: string;
  name: string;
  position: string;
}

export type CrewStatus = "On Site" | "En Route" | "Available" | "Delayed" | "Off Shift";

export interface Crew {
  id: string;
  name: string;
  specialty: string;
  status: CrewStatus;
  lead: string;
  members: CrewMember[];
  currentWorkOrderId?: string;
  completedJobs: number;
  hoursThisWeek: number;
  location: GeoPoint;
  locationLabel: string;
  vehicle: string;
}

export interface Project {
  id: string;
  name: string;
  highway: string;
  region: string;
}

export type WorkOrderStatus =
  "Assigned" | "In Progress" | "Awaiting Review" | "Completed" | "Blocked";
export type Priority = "Low" | "Medium" | "High" | "Critical";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  sizeKb: number;
  kind: "pdf" | "dwg" | "xlsx" | "doc";
}

export interface WorkOrder {
  id: string;
  title: string;
  type: string;
  projectId: string;
  highway: string;
  km: number;
  locationLabel: string;
  location: GeoPoint;
  crewId: string;
  assignedTo: string;
  supervisor: string;
  priority: Priority;
  status: WorkOrderStatus;
  dueDate: string;
  createdAt: string;
  description: string;
  checklist: ChecklistItem[];
  attachments: Attachment[];
}

export type FieldJobStatus = "Assigned" | "In Progress" | "Paused" | "Completed";

export interface FieldJob {
  id: string;
  workOrderId: string;
  title: string;
  scheduledAt: string;
  crewId: string;
  status: FieldJobStatus;
  instructions: string[];
  safetyNotes: string[];
  assignedUserIds?: string[];
  inspectionId?: string;
  startedAt?: string;
  completedAt?: string;
  syncStatus: SyncStatus;
}

export type InspectionTemplate = "guardrail" | "drainage" | "surface" | "structure";

export interface InspectionQuestion {
  id: string;
  label: string;
  type: "select" | "boolean";
  options?: string[];
  required?: boolean;
}

export type InspectionStatus = "Pending" | "In Progress" | "Passed" | "Failed";

export interface InspectionMeasurements {
  length?: string;
  width?: string;
  height?: string;
}

export interface Inspection {
  id: string;
  title: string;
  template: InspectionTemplate;
  workOrderId: string;
  locationLabel: string;
  inspector: string;
  status: InspectionStatus;
  scheduledFor: string;
  answers: Record<string, string>;
  notes: string;
  measurements: InspectionMeasurements;
  locationEvidence?: LocationEvidence;
  submittedAt?: string;
  syncStatus: SyncStatus;
}

export interface Measurement {
  id: string;
  workOrderId: string;
  inspectionId?: string;
  kind: string;
  value: number;
  unit: string;
  recordedBy: string;
  recordedAt: string;
  notes?: string;
  location?: LocationEvidence;
  syncStatus: SyncStatus;
}

export type DeficiencyStatus = "Open" | "Assigned" | "In Progress" | "Resolved" | "Verified";

export interface DeficiencyHistoryEntry {
  status: DeficiencyStatus;
  at: string;
  by: string;
  note?: string;
}

export interface Deficiency {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: Priority;
  status: DeficiencyStatus;
  highway: string;
  locationLabel: string;
  location: LocationEvidence;
  reportedBy: string;
  reportedAt: string;
  workOrderId?: string;
  inspectionId?: string;
  assignedCrewId?: string;
  dueDate?: string;
  resolutionNotes?: string;
  history: DeficiencyHistoryEntry[];
  syncStatus: SyncStatus;
}

export type PhotoCategory = "Before" | "During" | "After" | "Deficiency" | "Safety" | "Equipment";

export interface PhotoEvidence {
  id: string;
  /** Either a data: URL (captured on device) or a `sample:<key>` reference. */
  url: string;
  caption: string;
  category: PhotoCategory;
  takenAt: string;
  uploader: string;
  workOrderId: string;
  deficiencyId?: string;
  inspectionId?: string;
  location: LocationEvidence;
  syncStatus: SyncStatus;
}

export type SyncEntityType = "Inspection" | "Deficiency" | "Photo" | "Measurement" | "Job" | "Note";
export type SyncItemStatus = "Queued" | "Uploading" | "Synced" | "Failed";

export interface SyncItem {
  id: string;
  idempotencyKey?: string;
  entityType: SyncEntityType;
  entityId: string;
  label: string;
  action: "create" | "update" | "delete";
  createdAt: string;
  status: SyncItemStatus;
  error?: string;
  payload?: unknown;
}

export type Tone = "success" | "warning" | "critical" | "info" | "neutral";

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  tone: Tone;
  link?: { kind: "deficiency" | "workOrder" | "sync"; id?: string };
}

export interface ActivityEvent {
  id: string;
  at: string;
  actor: string;
  message: string;
  workOrderId?: string;
  tone?: Tone;
}

export type ReportKind = "daily" | "weekly" | "inspection" | "deficiency" | "crew";

export interface Report {
  id: ReportKind;
  name: string;
  description: string;
}

export interface ReportRow {
  date: string;
  highway: string;
  crewId: string;
  projectId: string;
  jobsCompleted: number;
  jobsDelayed: number;
  deficienciesCreated: number;
  deficienciesResolved: number;
  inspections: number;
  inspectionsPassed: number;
  hours: number;
}
