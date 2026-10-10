import type {
  ActivityEvent,
  Crew,
  Deficiency,
  FieldJob,
  Inspection,
  Measurement,
  Notification,
  PhotoEvidence,
  Project,
  User,
  WorkOrder,
} from "@/types";

/** Fixed operating day for the demo. Times are Pacific (UTC-7). */
const pad = (n: number) => String(n).padStart(2, "0");
export const t = (h: number, m: number, dayOffset = 0) =>
  `2026-10-${pad(8 + dayOffset)}T${pad(h)}:${pad(m)}:00-07:00`;

export const users: User[] = [
  { id: "U-101", name: "Alex Chen", initials: "AC", role: "field_worker", title: "Maintenance Technician", crewId: "CR-12", email: "a.chen@siteflow.demo" },
  { id: "U-102", name: "Jordan Smith", initials: "JS", role: "field_worker", title: "Equipment Operator", crewId: "CR-12", email: "j.smith@siteflow.demo" },
  { id: "U-103", name: "Michael Brown", initials: "MB", role: "field_worker", title: "Traffic Control Lead", crewId: "CR-12", email: "m.brown@siteflow.demo" },
  { id: "U-201", name: "Jordan Lee", initials: "JL", role: "supervisor", title: "Operations Supervisor", email: "j.lee@siteflow.demo" },
  { id: "U-301", name: "Priya Sandhu", initials: "PS", role: "admin", title: "Operations Administrator", email: "p.sandhu@siteflow.demo" },
  { id: "U-104", name: "Maria Gonzalez", initials: "MG", role: "field_worker", title: "Road Inspector", crewId: "CR-07", email: "m.gonzalez@siteflow.demo" },
  { id: "U-105", name: "Daniel Okafor", initials: "DO", role: "field_worker", title: "Road Inspector", crewId: "CR-07", email: "d.okafor@siteflow.demo" },
  { id: "U-106", name: "Hannah Reid", initials: "HR", role: "field_worker", title: "Bridge Technician", crewId: "CR-03", email: "h.reid@siteflow.demo" },
  { id: "U-202", name: "Marcus Delorme", initials: "MD", role: "supervisor", title: "Area Supervisor — Okanagan", email: "m.delorme@siteflow.demo" },
];

export const demoUserByRole = {
  field_worker: "U-101",
  supervisor: "U-201",
  admin: "U-301",
} as const;

export const projects: Project[] = [
  { id: "PRJ-HWY5", name: "Highway 5 Corridor Maintenance 2026", highway: "Highway 5", region: "Thompson–Nicola" },
  { id: "PRJ-HWY1", name: "Trans-Canada Hwy 1 Drainage Program", highway: "Highway 1", region: "Thompson" },
  { id: "PRJ-HWY97", name: "Highway 97 Pavement Rehabilitation", highway: "Highway 97", region: "Okanagan" },
  { id: "PRJ-BRG", name: "Interior Bridge Inspection Program", highway: "Highway 97", region: "North Okanagan" },
];

export const highways = ["Highway 1", "Highway 5", "Highway 97", "Highway 97C"];

export const crews: Crew[] = [
  {
    id: "CR-12", name: "Crew 12", specialty: "Highway Maintenance", status: "On Site", lead: "Alex Chen",
    members: [
      { userId: "U-101", name: "Alex Chen", position: "Crew Lead / Technician" },
      { userId: "U-102", name: "Jordan Smith", position: "Equipment Operator" },
      { userId: "U-103", name: "Michael Brown", position: "Traffic Control" },
    ],
    currentWorkOrderId: "WO-2081", completedJobs: 14, hoursThisWeek: 31.5,
    location: { lat: 50.6762, lng: -120.3301 }, locationLabel: "Highway 5, KM 42", vehicle: "Unit T-412 (F-550)",
  },
  {
    id: "CR-07", name: "Crew 7", specialty: "Road Inspection", status: "Available", lead: "Maria Gonzalez",
    members: [
      { userId: "U-104", name: "Maria Gonzalez", position: "Senior Road Inspector" },
      { userId: "U-105", name: "Daniel Okafor", position: "Road Inspector" },
    ],
    currentWorkOrderId: undefined, completedJobs: 19, hoursThisWeek: 28,
    location: { lat: 50.752, lng: -120.83 }, locationLabel: "Savona Yard", vehicle: "Unit P-207 (Silverado)",
  },
  {
    id: "CR-03", name: "Crew 3", specialty: "Bridge Maintenance", status: "Delayed", lead: "Hannah Reid",
    members: [
      { userId: "U-106", name: "Hannah Reid", position: "Bridge Technician" },
      { userId: "U-107", name: "Liam Tremblay", position: "Welder" },
      { userId: "U-108", name: "Ravi Mehta", position: "Labourer" },
    ],
    currentWorkOrderId: "WO-2084", completedJobs: 8, hoursThisWeek: 34,
    location: { lat: 50.298, lng: -119.29 }, locationLabel: "Highway 97, Vernon", vehicle: "Unit B-118 (Boom truck)",
  },
  {
    id: "CR-04", name: "Crew 4", specialty: "Drainage & Culverts", status: "En Route", lead: "Kenji Watanabe",
    members: [
      { userId: "U-109", name: "Kenji Watanabe", position: "Crew Lead" },
      { userId: "U-110", name: "Emily Clarke", position: "Vac Truck Operator" },
    ],
    currentWorkOrderId: "WO-2085", completedJobs: 11, hoursThisWeek: 26.5,
    location: { lat: 50.73, lng: -120.7 }, locationLabel: "Highway 1, Kamloops Lake", vehicle: "Unit V-330 (Vac truck)",
  },
  {
    id: "CR-09", name: "Crew 9", specialty: "Pavement & Line Painting", status: "On Site", lead: "Sam Whitford",
    members: [
      { userId: "U-111", name: "Sam Whitford", position: "Crew Lead" },
      { userId: "U-112", name: "Noah Fraser", position: "Paint Truck Operator" },
      { userId: "U-113", name: "Ava Kowalski", position: "Traffic Control" },
    ],
    currentWorkOrderId: "WO-2087", completedJobs: 16, hoursThisWeek: 33,
    location: { lat: 49.9, lng: -120.1 }, locationLabel: "Highway 97C, Elkhart", vehicle: "Unit L-505 (Line striper)",
  },
];

const guardrailChecklist = [
  { id: "c1", label: "Traffic control set up per TMP", done: true },
  { id: "c2", label: "Pre-work photos captured", done: true },
  { id: "c3", label: "Damaged rail sections removed", done: false },
  { id: "c4", label: "Posts inspected and replaced", done: false },
  { id: "c5", label: "New W-beam installed and torqued", done: false },
  { id: "c6", label: "Reflectors reinstalled", done: false },
  { id: "c7", label: "After photos captured", done: false },
];

const genericChecklist = (labels: string[], done = 0) =>
  labels.map((label, i) => ({ id: `c${i + 1}`, label, done: i < done }));

export const workOrders: WorkOrder[] = [
  {
    id: "WO-2081", title: "Highway 5 Guardrail Repair", type: "Guardrail", projectId: "PRJ-HWY5", highway: "Highway 5", km: 42,
    locationLabel: "Highway 5, KM 42 (northbound)", location: { lat: 50.6745, lng: -120.3273 }, crewId: "CR-12", assignedTo: "Alex Chen",
    supervisor: "Jordan Lee", priority: "High", status: "In Progress", dueDate: t(17, 0), createdAt: t(16, 20, -1),
    description: "Vehicle impact reported overnight. Approximately 8 m of W-beam guardrail is deformed with two posts sheared. Replace damaged sections, reset posts, and restore reflectors. Single-lane alternating traffic permitted 08:00–16:00.",
    checklist: guardrailChecklist,
    attachments: [
      { id: "A-1", name: "Traffic-Management-Plan-HWY5-KM42.pdf", sizeKb: 842, kind: "pdf" },
      { id: "A-2", name: "Guardrail-Std-Drawing-SP941.dwg", sizeKb: 1260, kind: "dwg" },
    ],
  },
  {
    id: "WO-2082", title: "Highway 1 Drainage Inspection", type: "Drainage", projectId: "PRJ-HWY1", highway: "Highway 1", km: 368,
    locationLabel: "Highway 1, KM 368 (Valleyview)", location: { lat: 50.69, lng: -120.12 }, crewId: "CR-12", assignedTo: "Alex Chen",
    supervisor: "Jordan Lee", priority: "Medium", status: "Assigned", dueDate: t(15, 0), createdAt: t(9, 10, -2),
    description: "Inspect ditch line and two cross-culverts ahead of fall rain season. Record blockage percentage and any erosion at outlets.",
    checklist: genericChecklist(["Ditch line walked", "Culvert inlets inspected", "Culvert outlets inspected", "Blockage recorded", "Photos captured"]),
    attachments: [{ id: "A-3", name: "Culvert-Inventory-HWY1.xlsx", sizeKb: 96, kind: "xlsx" }],
  },
  {
    id: "WO-2083", title: "Highway 97 Surface Assessment", type: "Pavement", projectId: "PRJ-HWY97", highway: "Highway 97", km: 12,
    locationLabel: "Highway 97, KM 12 (Monte Lake)", location: { lat: 50.5, lng: -119.83 }, crewId: "CR-12", assignedTo: "Jordan Smith",
    supervisor: "Jordan Lee", priority: "Medium", status: "Assigned", dueDate: t(18, 0), createdAt: t(11, 0, -3),
    description: "Visual pavement condition survey of a 2 km segment. Log cracking, rutting and potholes for the rehabilitation program.",
    checklist: genericChecklist(["Segment start/end GPS recorded", "Cracking logged", "Rutting measured", "Potholes logged"]),
    attachments: [],
  },
  {
    id: "WO-2084", title: "Bridge Deck Joint Repair — Vernon Creek", type: "Structure", projectId: "PRJ-BRG", highway: "Highway 97", km: 151,
    locationLabel: "Highway 97, Vernon Creek Bridge", location: { lat: 50.29, lng: -119.27 }, crewId: "CR-03", assignedTo: "Hannah Reid",
    supervisor: "Marcus Delorme", priority: "High", status: "Blocked", dueDate: t(16, 0), createdAt: t(8, 0, -4),
    description: "Expansion joint seal failure on south abutment. Work blocked pending delivery of replacement seal assembly.",
    checklist: genericChecklist(["Lane closure permit", "Joint cleaned", "Seal installed", "Cure time logged"], 1),
    attachments: [{ id: "A-4", name: "Bridge-Inspection-VC-2025.pdf", sizeKb: 2310, kind: "pdf" }],
  },
  {
    id: "WO-2085", title: "Highway 1 Culvert Clearing", type: "Drainage", projectId: "PRJ-HWY1", highway: "Highway 1", km: 341,
    locationLabel: "Highway 1, KM 341 (Kamloops Lake)", location: { lat: 50.735, lng: -120.68 }, crewId: "CR-04", assignedTo: "Kenji Watanabe",
    supervisor: "Jordan Lee", priority: "High", status: "In Progress", dueDate: t(14, 0), createdAt: t(13, 30, -1),
    description: "Hydro-vac clearing of a 900 mm CSP culvert reported 70% blocked after last week's storm.",
    checklist: genericChecklist(["Traffic control set up", "Inlet cleared", "Barrel flushed", "Outlet armouring checked"], 2),
    attachments: [],
  },
  {
    id: "WO-2086", title: "Highway 5 Pothole Patching", type: "Pavement", projectId: "PRJ-HWY5", highway: "Highway 5", km: 18,
    locationLabel: "Highway 5, KM 18 (Lac Le Jeune)", location: { lat: 50.48, lng: -120.5 }, crewId: "CR-09", assignedTo: "Sam Whitford",
    supervisor: "Jordan Lee", priority: "Low", status: "Awaiting Review", dueDate: t(12, 0), createdAt: t(7, 0, -2),
    description: "Cold-mix patching of six potholes in the southbound travel lane.",
    checklist: genericChecklist(["Potholes cleaned", "Patch placed", "Compacted", "Photos captured"], 4),
    attachments: [],
  },
  {
    id: "WO-2087", title: "Highway 97C Line Repainting", type: "Line Painting", projectId: "PRJ-HWY97", highway: "Highway 97C", km: 64,
    locationLabel: "Highway 97C, KM 64 (Elkhart)", location: { lat: 49.88, lng: -120.1 }, crewId: "CR-09", assignedTo: "Sam Whitford",
    supervisor: "Marcus Delorme", priority: "Medium", status: "In Progress", dueDate: t(18, 0), createdAt: t(10, 0, -3),
    description: "Repaint centre and edge lines over 14 km. Moving operation with shadow vehicle.",
    checklist: genericChecklist(["Shadow vehicle in place", "Centre line", "Edge lines", "Retro-reflectivity check"], 1),
    attachments: [],
  },
  {
    id: "WO-2088", title: "Highway 1 Sign Replacement", type: "Signage", projectId: "PRJ-HWY1", highway: "Highway 1", km: 330,
    locationLabel: "Highway 1, KM 330 (Savona)", location: { lat: 50.752, lng: -120.85 }, crewId: "CR-07", assignedTo: "Maria Gonzalez",
    supervisor: "Jordan Lee", priority: "Low", status: "Completed", dueDate: t(12, 0), createdAt: t(9, 0, -2),
    description: "Replace knocked-down curve warning sign and post.",
    checklist: genericChecklist(["Old sign removed", "Post installed", "Sign mounted"], 3),
    attachments: [],
  },
  {
    id: "WO-2089", title: "Highway 5 Rockfall Fence Inspection", type: "Geotechnical", projectId: "PRJ-HWY5", highway: "Highway 5", km: 2,
    locationLabel: "Highway 5, KM 2 (Merritt)", location: { lat: 50.18, lng: -120.74 }, crewId: "CR-07", assignedTo: "Daniel Okafor",
    supervisor: "Jordan Lee", priority: "Critical", status: "Awaiting Review", dueDate: t(10, 0), createdAt: t(6, 30),
    description: "Inspect rockfall catch fence after reported debris on the shoulder. Determine whether lane closure is required.",
    checklist: genericChecklist(["Fence panels inspected", "Anchors inspected", "Debris volume estimated"], 3),
    attachments: [],
  },
  {
    id: "WO-2090", title: "Highway 97 Shoulder Grading", type: "Shoulder", projectId: "PRJ-HWY97", highway: "Highway 97", km: 38,
    locationLabel: "Highway 97, KM 38 (Falkland)", location: { lat: 50.5, lng: -119.56 }, crewId: "CR-04", assignedTo: "Emily Clarke",
    supervisor: "Marcus Delorme", priority: "Medium", status: "Assigned", dueDate: t(16, 0, 1), createdAt: t(15, 0, -1),
    description: "Regrade gravel shoulder to eliminate 75 mm drop-off along 600 m.",
    checklist: genericChecklist(["Grader mobilized", "Shoulder graded", "Compacted"]),
    attachments: [],
  },
  {
    id: "WO-2091", title: "Highway 1 Crack Sealing", type: "Pavement", projectId: "PRJ-HWY1", highway: "Highway 1", km: 352,
    locationLabel: "Highway 1, KM 352 (Cherry Creek)", location: { lat: 50.71, lng: -120.55 }, crewId: "CR-09", assignedTo: "Noah Fraser",
    supervisor: "Jordan Lee", priority: "Low", status: "Completed", dueDate: t(15, 0, -1), createdAt: t(8, 0, -5),
    description: "Rout-and-seal longitudinal cracks over 3 km.",
    checklist: genericChecklist(["Cracks routed", "Sealant applied"], 2),
    attachments: [],
  },
  {
    id: "WO-2092", title: "Highway 5 Culvert Inspection", type: "Drainage", projectId: "PRJ-HWY5", highway: "Highway 5", km: 61,
    locationLabel: "Highway 5, KM 61 (Heffley Creek)", location: { lat: 50.86, lng: -120.27 }, crewId: "CR-07", assignedTo: "Maria Gonzalez",
    supervisor: "Jordan Lee", priority: "Medium", status: "Assigned", dueDate: t(12, 0, 1), createdAt: t(14, 0, -1),
    description: "Routine inspection of three culverts on the Heffley Creek section.",
    checklist: genericChecklist(["Culvert 1", "Culvert 2", "Culvert 3"]),
    attachments: [],
  },
  {
    id: "WO-2093", title: "Highway 97 Guardrail End Treatment", type: "Guardrail", projectId: "PRJ-HWY97", highway: "Highway 97", km: 188,
    locationLabel: "Highway 97, KM 188 (Kelowna)", location: { lat: 49.93, lng: -119.42 }, crewId: "CR-03", assignedTo: "Liam Tremblay",
    supervisor: "Marcus Delorme", priority: "High", status: "In Progress", dueDate: t(17, 0, 1), createdAt: t(8, 0, -1),
    description: "Replace damaged energy-absorbing end terminal.",
    checklist: genericChecklist(["Terminal removed", "New terminal installed", "Delineator installed"], 1),
    attachments: [],
  },
  {
    id: "WO-2054", title: "Highway 5 Sign Post Repair", type: "Signage", projectId: "PRJ-HWY5", highway: "Highway 5", km: 30,
    locationLabel: "Highway 5, KM 30 (Knutsford)", location: { lat: 50.6, lng: -120.4 }, crewId: "CR-12", assignedTo: "Michael Brown",
    supervisor: "Jordan Lee", priority: "Low", status: "Completed", dueDate: t(16, 0, -1), createdAt: t(8, 0, -3),
    description: "Straighten and re-anchor speed sign post.",
    checklist: genericChecklist(["Post re-anchored", "Sign aligned"], 2),
    attachments: [],
  },
];

const stdSafety = [
  "Wear Class 3 high-visibility apparel and hard hat at all times.",
  "Confirm traffic control is in place before entering the travel lane.",
];

export const fieldJobs: FieldJob[] = [
  {
    id: "JOB-5101", workOrderId: "WO-2081", title: "Highway 5 Guardrail Inspection & Repair", scheduledAt: t(8, 0), crewId: "CR-12", status: "In Progress",
    instructions: ["Complete guardrail inspection INS-1042 before removal.", "Photograph damage from both approach directions.", "Measure total length of deformed rail.", "Replace posts and W-beam per drawing SP941."],
    safetyNotes: [...stdSafety, "Narrow shoulder — park work truck with arrow board upstream of work zone.", "Sheared posts have sharp edges; cut-resistant gloves required."],
    inspectionId: "INS-1042", startedAt: t(8, 43), syncStatus: "synced",
  },
  {
    id: "JOB-5102", workOrderId: "WO-2082", title: "Drainage Inspection", scheduledAt: t(11, 30), crewId: "CR-12", status: "Assigned",
    instructions: ["Walk ditch line from KM 367.5 to 368.5.", "Inspect both culvert ends and record blockage %.", "Report any erosion at outlets as a deficiency."],
    safetyNotes: [...stdSafety, "Steep ditch slopes — maintain three points of contact."],
    inspectionId: "INS-1043", syncStatus: "synced",
  },
  {
    id: "JOB-5103", workOrderId: "WO-2083", title: "Road Surface Assessment", scheduledAt: t(14, 0), crewId: "CR-12", status: "Assigned",
    instructions: ["Record GPS at segment start and end.", "Log cracking, rutting and potholes.", "Measure rut depth every 200 m."],
    safetyNotes: [...stdSafety, "Survey from shoulder only; no lane entry without TC."],
    inspectionId: "INS-1044", syncStatus: "synced",
  },
  {
    id: "JOB-5104", workOrderId: "WO-2085", title: "Culvert Clearing", scheduledAt: t(9, 0), crewId: "CR-04", status: "In Progress",
    instructions: ["Clear inlet debris.", "Hydro-vac barrel.", "Inspect outlet armouring."],
    safetyNotes: [...stdSafety, "Confined space — do not enter culvert barrel."],
    startedAt: t(9, 20), syncStatus: "synced",
  },
  {
    id: "JOB-5105", workOrderId: "WO-2087", title: "Line Repainting", scheduledAt: t(7, 30), crewId: "CR-09", status: "In Progress",
    instructions: ["Paint centre line KM 58–72.", "Spot-check retro-reflectivity."],
    safetyNotes: [...stdSafety, "Moving operation — shadow vehicle must remain within 150 m."],
    startedAt: t(7, 45), syncStatus: "synced",
  },
  {
    id: "JOB-5106", workOrderId: "WO-2093", title: "Guardrail End Treatment", scheduledAt: t(10, 0), crewId: "CR-03", status: "Paused",
    instructions: ["Remove damaged terminal.", "Install new terminal per manufacturer spec."],
    safetyNotes: [...stdSafety],
    startedAt: t(10, 15), syncStatus: "synced",
  },
];

export const inspections: Inspection[] = [
  { id: "INS-1042", title: "Guardrail Inspection", template: "guardrail", workOrderId: "WO-2081", locationLabel: "Highway 5, KM 42", inspector: "Alex Chen", status: "In Progress", scheduledFor: t(8, 30), answers: {}, notes: "", measurements: {}, syncStatus: "synced" },
  { id: "INS-1043", title: "Drainage Inspection", template: "drainage", workOrderId: "WO-2082", locationLabel: "Highway 1, KM 368", inspector: "Alex Chen", status: "Pending", scheduledFor: t(11, 30), answers: {}, notes: "", measurements: {}, syncStatus: "synced" },
  { id: "INS-1044", title: "Road Surface Assessment", template: "surface", workOrderId: "WO-2083", locationLabel: "Highway 97, KM 12", inspector: "Jordan Smith", status: "Pending", scheduledFor: t(14, 0), answers: {}, notes: "", measurements: {}, syncStatus: "synced" },
  { id: "INS-1039", title: "Bridge Joint Inspection", template: "structure", workOrderId: "WO-2084", locationLabel: "Vernon Creek Bridge", inspector: "Hannah Reid", status: "Pending", scheduledFor: t(13, 0), answers: {}, notes: "", measurements: {}, syncStatus: "synced" },
  { id: "INS-1041", title: "Culvert Inspection", template: "drainage", workOrderId: "WO-2092", locationLabel: "Highway 5, KM 61", inspector: "Maria Gonzalez", status: "Pending", scheduledFor: t(9, 0, 1), answers: {}, notes: "", measurements: {}, syncStatus: "synced" },
  { id: "INS-1045", title: "Guardrail End Terminal Inspection", template: "guardrail", workOrderId: "WO-2093", locationLabel: "Highway 97, KM 188", inspector: "Liam Tremblay", status: "Pending", scheduledFor: t(15, 0), answers: {}, notes: "", measurements: {}, syncStatus: "synced" },
  { id: "INS-1046", title: "Shoulder Drop-off Inspection", template: "surface", workOrderId: "WO-2090", locationLabel: "Highway 97, KM 38", inspector: "Emily Clarke", status: "Pending", scheduledFor: t(8, 0, 1), answers: {}, notes: "", measurements: {}, syncStatus: "synced" },
  {
    id: "INS-1038", title: "Rockfall Fence Inspection", template: "structure", workOrderId: "WO-2089", locationLabel: "Highway 5, KM 2", inspector: "Daniel Okafor", status: "Failed", scheduledFor: t(7, 0),
    answers: { condition: "Poor", hazard: "Yes", severity: "Critical" }, notes: "Two fence panels torn; ~3 m³ debris on shoulder.", measurements: { length: "12" },
    locationEvidence: { lat: 50.1812, lng: -120.7391, accuracy: 6, capturedAt: t(7, 42) }, submittedAt: t(7, 58), syncStatus: "synced",
  },
  {
    id: "INS-1035", title: "Sign Visibility Inspection", template: "structure", workOrderId: "WO-2088", locationLabel: "Highway 1, KM 330", inspector: "Maria Gonzalez", status: "Passed", scheduledFor: t(10, 0, -1),
    answers: { condition: "Good", hazard: "No" }, notes: "", measurements: {}, submittedAt: t(10, 40, -1), syncStatus: "synced",
  },
  {
    id: "INS-1036", title: "Crack Seal QA", template: "surface", workOrderId: "WO-2091", locationLabel: "Highway 1, KM 352", inspector: "Jordan Lee", status: "Passed", scheduledFor: t(14, 0, -1),
    answers: { condition: "Good", hazard: "No" }, notes: "Sealant adhesion good.", measurements: {}, submittedAt: t(14, 30, -1), syncStatus: "synced",
  },
  {
    id: "INS-1040", title: "Pothole Patch QA", template: "surface", workOrderId: "WO-2086", locationLabel: "Highway 5, KM 18", inspector: "Jordan Lee", status: "Passed", scheduledFor: t(9, 0),
    answers: { condition: "Good", hazard: "No" }, notes: "", measurements: {}, submittedAt: t(9, 25), syncStatus: "synced",
  },
];

const loc = (lat: number, lng: number, accuracy: number, capturedAt: string) => ({ lat, lng, accuracy, capturedAt });

const def = (d: Omit<Deficiency, "history" | "syncStatus"> & { history?: Deficiency["history"] }): Deficiency => ({
  ...d,
  history: d.history ?? [{ status: "Open", at: d.reportedAt, by: d.reportedBy }],
  syncStatus: "synced",
});

export const deficiencies: Deficiency[] = [
  def({ id: "DEF-207", title: "Blocked drainage", description: "Culvert inlet ~70% blocked with debris; water ponding at shoulder.", category: "Drainage", severity: "High", status: "Assigned", highway: "Highway 1", locationLabel: "Highway 1, KM 341", location: loc(50.7351, -120.6812, 7, t(8, 10)), reportedBy: "Kenji Watanabe", reportedAt: t(8, 10), workOrderId: "WO-2085", assignedCrewId: "CR-04", dueDate: t(14, 0),
    history: [{ status: "Open", at: t(8, 10), by: "Kenji Watanabe" }, { status: "Assigned", at: t(8, 25), by: "Jordan Lee", note: "Assigned to Crew 4" }] }),
  def({ id: "DEF-206", title: "Pothole cluster", description: "Six potholes up to 90 mm deep in southbound lane.", category: "Pavement", severity: "Medium", status: "In Progress", highway: "Highway 5", locationLabel: "Highway 5, KM 18", location: loc(50.4801, -120.5012, 5, t(15, 0, -2)), reportedBy: "Sam Whitford", reportedAt: t(15, 0, -2), workOrderId: "WO-2086", assignedCrewId: "CR-09", dueDate: t(12, 0),
    history: [{ status: "Open", at: t(15, 0, -2), by: "Sam Whitford" }, { status: "Assigned", at: t(16, 0, -2), by: "Jordan Lee" }, { status: "In Progress", at: t(8, 0, -1), by: "Sam Whitford" }] }),
  def({ id: "DEF-205", title: "Faded lane markings", description: "Centre line retro-reflectivity below threshold over 4 km.", category: "Line Painting", severity: "Low", status: "Open", highway: "Highway 97C", locationLabel: "Highway 97C, KM 66", location: loc(49.875, -120.05, 9, t(11, 0, -1)), reportedBy: "Noah Fraser", reportedAt: t(11, 0, -1), workOrderId: "WO-2087" }),
  def({ id: "DEF-204", title: "Rockfall debris on shoulder", description: "Approx. 3 m³ of rock on northbound shoulder; two catch fence panels torn.", category: "Geotechnical", severity: "Critical", status: "Assigned", highway: "Highway 5", locationLabel: "Highway 5, KM 2", location: loc(50.1812, -120.7391, 6, t(7, 42)), reportedBy: "Daniel Okafor", reportedAt: t(7, 42), workOrderId: "WO-2089", inspectionId: "INS-1038", assignedCrewId: "CR-07", dueDate: t(12, 0),
    history: [{ status: "Open", at: t(7, 42), by: "Daniel Okafor" }, { status: "Assigned", at: t(7, 55), by: "Jordan Lee", note: "Escalated — Crew 7 to remain on site" }] }),
  def({ id: "DEF-203", title: "Bridge expansion joint gap", description: "Seal missing on south abutment joint; 40 mm open gap.", category: "Structure", severity: "High", status: "In Progress", highway: "Highway 97", locationLabel: "Vernon Creek Bridge", location: loc(50.2903, -119.2711, 4, t(9, 0, -4)), reportedBy: "Hannah Reid", reportedAt: t(9, 0, -4), workOrderId: "WO-2084", assignedCrewId: "CR-03", dueDate: t(16, 0),
    history: [{ status: "Open", at: t(9, 0, -4), by: "Hannah Reid" }, { status: "Assigned", at: t(10, 0, -4), by: "Marcus Delorme" }, { status: "In Progress", at: t(8, 0, -3), by: "Hannah Reid" }] }),
  def({ id: "DEF-202", title: "Missing reflectors", description: "Approximately 12 guardrail reflectors missing.", category: "Guardrail", severity: "Low", status: "Open", highway: "Highway 1", locationLabel: "Highway 1, KM 352", location: loc(50.7105, -120.551, 8, t(13, 20, -1)), reportedBy: "Maria Gonzalez", reportedAt: t(13, 20, -1) }),
  def({ id: "DEF-201", title: "Erosion at culvert outlet", description: "Scour hole developing at outlet; riprap displaced.", category: "Drainage", severity: "Medium", status: "Assigned", highway: "Highway 1", locationLabel: "Highway 1, KM 343", location: loc(50.731, -120.66, 7, t(10, 0, -2)), reportedBy: "Emily Clarke", reportedAt: t(10, 0, -2), assignedCrewId: "CR-04", dueDate: t(16, 0, 2),
    history: [{ status: "Open", at: t(10, 0, -2), by: "Emily Clarke" }, { status: "Assigned", at: t(11, 0, -2), by: "Jordan Lee" }] }),
  def({ id: "DEF-200", title: "Edge cracking", description: "Longitudinal edge cracking along 300 m of northbound lane.", category: "Pavement", severity: "Medium", status: "Open", highway: "Highway 97", locationLabel: "Highway 97, KM 14", location: loc(50.49, -119.8, 10, t(15, 30, -1)), reportedBy: "Jordan Smith", reportedAt: t(15, 30, -1) }),
  def({ id: "DEF-197", title: "Shoulder drop-off", description: "75 mm drop-off between pavement edge and gravel shoulder.", category: "Shoulder", severity: "High", status: "Open", highway: "Highway 97", locationLabel: "Highway 97, KM 38", location: loc(50.5011, -119.561, 6, t(14, 10, -1)), reportedBy: "Emily Clarke", reportedAt: t(14, 10, -1), workOrderId: "WO-2090" }),
  def({ id: "DEF-196", title: "Debris in ditch", description: "Tire carcass and branches obstructing ditch flow.", category: "Drainage", severity: "Low", status: "Open", highway: "Highway 5", locationLabel: "Highway 5, KM 55", location: loc(50.8, -120.29, 9, t(12, 0, -1)), reportedBy: "Michael Brown", reportedAt: t(12, 0, -1) }),
  def({ id: "DEF-199", title: "Damaged sign post", description: "Speed sign post bent after snowplow contact.", category: "Signage", severity: "Low", status: "Resolved", highway: "Highway 5", locationLabel: "Highway 5, KM 30", location: loc(50.6, -120.4, 5, t(9, 0, -3)), reportedBy: "Michael Brown", reportedAt: t(9, 0, -3), workOrderId: "WO-2054", assignedCrewId: "CR-12", resolutionNotes: "Post re-anchored and sign realigned.",
    history: [{ status: "Open", at: t(9, 0, -3), by: "Michael Brown" }, { status: "Assigned", at: t(9, 30, -3), by: "Jordan Lee" }, { status: "In Progress", at: t(10, 0, -1), by: "Michael Brown" }, { status: "Resolved", at: t(11, 20, -1), by: "Michael Brown" }] }),
  def({ id: "DEF-198", title: "Knocked-down curve sign", description: "Curve warning sign flattened.", category: "Signage", severity: "Medium", status: "Verified", highway: "Highway 1", locationLabel: "Highway 1, KM 330", location: loc(50.752, -120.85, 5, t(8, 0, -2)), reportedBy: "Maria Gonzalez", reportedAt: t(8, 0, -2), workOrderId: "WO-2088", assignedCrewId: "CR-07", resolutionNotes: "Replaced sign and post.",
    history: [{ status: "Open", at: t(8, 0, -2), by: "Maria Gonzalez" }, { status: "Assigned", at: t(8, 20, -2), by: "Jordan Lee" }, { status: "In Progress", at: t(9, 0, -1), by: "Maria Gonzalez" }, { status: "Resolved", at: t(10, 40, -1), by: "Maria Gonzalez" }, { status: "Verified", at: t(15, 0, -1), by: "Jordan Lee" }] }),
];

export const photos: PhotoEvidence[] = [
  { id: "IMG-3017", url: "sample:guardrail", caption: "Deformed W-beam, approach side", category: "Before", takenAt: t(8, 52), uploader: "Alex Chen", workOrderId: "WO-2081", location: loc(50.6746, -120.3275, 6, t(8, 52)), syncStatus: "synced" },
  { id: "IMG-3018", url: "sample:highway", caption: "Traffic control set up, KM 41.8", category: "Safety", takenAt: t(8, 47), uploader: "Michael Brown", workOrderId: "WO-2081", location: loc(50.6731, -120.3262, 8, t(8, 47)), syncStatus: "synced" },
  { id: "IMG-3019", url: "sample:drainage", caption: "Culvert inlet blockage", category: "Deficiency", takenAt: t(8, 11), uploader: "Kenji Watanabe", workOrderId: "WO-2085", deficiencyId: "DEF-207", location: loc(50.7351, -120.6812, 7, t(8, 11)), syncStatus: "synced" },
  { id: "IMG-3020", url: "sample:pothole", caption: "Largest pothole, 90 mm depth", category: "Deficiency", takenAt: t(15, 2, -2), uploader: "Sam Whitford", workOrderId: "WO-2086", deficiencyId: "DEF-206", location: loc(50.4801, -120.5012, 5, t(15, 2, -2)), syncStatus: "synced" },
];

export const measurements: Measurement[] = [
  { id: "MES-910", workOrderId: "WO-2085", kind: "Culvert blockage", value: 70, unit: "%", recordedBy: "Kenji Watanabe", recordedAt: t(8, 12), syncStatus: "synced" },
  { id: "MES-911", workOrderId: "WO-2086", kind: "Pothole depth", value: 90, unit: "mm", recordedBy: "Sam Whitford", recordedAt: t(15, 3, -2), syncStatus: "synced" },
];

export const notifications: Notification[] = [
  { id: "N-1", title: "Critical deficiency reported", body: "DEF-204 Rockfall debris on shoulder — Highway 5, KM 2", at: t(7, 42), read: false, tone: "critical", link: { kind: "deficiency", id: "DEF-204" } },
  { id: "N-2", title: "Work order blocked", body: "WO-2084 is waiting on material delivery", at: t(8, 5), read: false, tone: "warning", link: { kind: "workOrder", id: "WO-2084" } },
  { id: "N-3", title: "Inspection submitted", body: "INS-1040 Pothole Patch QA passed", at: t(9, 25), read: true, tone: "success" },
  { id: "N-4", title: "Crew 12 on site", body: "Arrived at Highway 5, KM 42", at: t(8, 43), read: true, tone: "info", link: { kind: "workOrder", id: "WO-2081" } },
];

export const activity: ActivityEvent[] = [
  { id: "EV-20", at: t(9, 25), actor: "Jordan Lee", message: "Inspection #INS-1040 completed — passed", workOrderId: "WO-2086", tone: "success" },
  { id: "EV-19", at: t(9, 20), actor: "Crew 4", message: "Crew 4 started Work Order #WO-2085", workOrderId: "WO-2085", tone: "info" },
  { id: "EV-18", at: t(9, 2), actor: "Alex Chen", message: "Inspection #INS-1042 started", workOrderId: "WO-2081", tone: "info" },
  { id: "EV-17", at: t(8, 52), actor: "Alex Chen", message: "Photo evidence uploaded (IMG-3017)", workOrderId: "WO-2081" },
  { id: "EV-16", at: t(8, 43), actor: "Crew 12", message: "Crew 12 arrived on site", workOrderId: "WO-2081", tone: "info" },
  { id: "EV-15", at: t(8, 14), actor: "Jordan Lee", message: "Crew 12 assigned to Work Order #WO-2081", workOrderId: "WO-2081" },
  { id: "EV-14", at: t(8, 10), actor: "Kenji Watanabe", message: "Kenji reported blocked drainage", workOrderId: "WO-2085", tone: "warning" },
  { id: "EV-13", at: t(7, 58), actor: "Daniel Okafor", message: "Inspection #INS-1038 failed — rockfall fence damaged", workOrderId: "WO-2089", tone: "critical" },
  { id: "EV-12", at: t(15, 10, -1), actor: "Jordan Lee", message: "Supervisor approved Job #WO-2054", workOrderId: "WO-2054", tone: "success" },
];
