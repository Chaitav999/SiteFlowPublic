export const workOrders = [
  {
    id: "WO-1001",
    workOrderNumber: "WO-1001",
    title: "Guardrail repair",
    type: "Maintenance",
    projectId: "PRJ-100",
    highway: "Highway 97",
    km: 18.4,
    locationLabel: "Northbound MP 18.4",
    location: { lat: 49.232, lng: -122.811 },
    crewId: "CR-10",
    assignedTo: "USR-2",
    supervisor: "USR-1",
    priority: "High",
    status: "Assigned",
    dueDate: "2026-10-09T18:00:00Z",
    createdAt: "2026-10-07T08:00:00Z",
    description: "Replace damaged guardrail posts and inspect adjacent signage.",
    checklist: [],
    attachments: [],
  },
];

export const inspections = [
  {
    id: "INS-2001",
    title: "Guardrail inspection",
    template: "guardrail",
    workOrderId: "WO-1001",
    locationLabel: "Northbound MP 18.4",
    inspector: "USR-2",
    status: "In Progress",
    scheduledFor: "2026-10-08T10:00:00Z",
    answers: { guardrail: "Good", damage: "No" },
    notes: "No active hazards observed.",
    measurements: { length: "12.3", width: "1.5" },
    locationEvidence: {
      lat: 49.2321,
      lng: -122.8112,
      accuracy: 5,
      capturedAt: "2026-10-08T09:55:00Z",
    },
    syncStatus: "synced",
  },
];

export const deficiencies = [
  {
    id: "DEF-3001",
    title: "Damaged post",
    description: "A guardrail post has sheared near the base.",
    category: "Guardrail",
    severity: "High",
    status: "Open",
    highway: "Highway 97",
    locationLabel: "Northbound MP 18.4",
    location: { lat: 49.2323, lng: -122.811, accuracy: 4, capturedAt: "2026-10-08T09:57:00Z" },
    reportedBy: "USR-2",
    reportedAt: "2026-10-08T09:58:00Z",
    workOrderId: "WO-1001",
    inspectionId: "INS-2001",
    syncStatus: "synced",
    history: [],
  },
];

export const photos = [
  {
    id: "IMG-4001",
    url: "sample:guardrail",
    caption: "Damaged guardrail post",
    category: "Deficiency",
    takenAt: "2026-10-08T09:59:00Z",
    uploader: "USR-2",
    workOrderId: "WO-1001",
    deficiencyId: "DEF-3001",
    inspectionId: "INS-2001",
    location: { lat: 49.2323, lng: -122.811, accuracy: 4, capturedAt: "2026-10-08T09:59:00Z" },
    syncStatus: "synced",
  },
];
