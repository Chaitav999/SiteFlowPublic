import { crews, projects } from "@/data/seed";
import type { Report, ReportRow } from "@/types";
import { appStore } from "@/store/appStore";

export const reportCatalog: Report[] = [
  { id: "daily", name: "Daily Operations Report", description: "Jobs, crews and incidents for a single shift." },
  { id: "weekly", name: "Weekly Maintenance Report", description: "Completed vs delayed maintenance over the week." },
  { id: "inspection", name: "Inspection Summary", description: "Inspection volume and pass rate by highway." },
  { id: "deficiency", name: "Deficiency Report", description: "Deficiencies created vs resolved, by severity." },
  { id: "crew", name: "Crew Productivity Report", description: "Jobs and hours per crew." },
];

export interface ReportFilters {
  days: number;
  projectId: string; // "all" or id
  highway: string;
  crewId: string;
}

/** Deterministic pseudo-random generator so SSR and client agree. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

let cache: ReportRow[] | null = null;
function dataset(): ReportRow[] {
  if (cache) return cache;
  const rand = lcg(42);
  const rows: ReportRow[] = [];
  const end = new Date("2026-10-08T12:00:00-07:00").getTime();
  for (let d = 29; d >= 0; d--) {
    const date = new Date(end - d * 86400000).toISOString();
    const weekend = [0, 6].includes(new Date(end - d * 86400000).getUTCDay());
    for (const crew of crews) {
      const project = projects[Math.floor(rand() * projects.length)];
      const base = weekend ? 0.3 : 1;
      const inspections = Math.round((1 + rand() * 3) * base);
      rows.push({
        date,
        highway: project.highway,
        crewId: crew.id,
        projectId: project.id,
        jobsCompleted: Math.round((1 + rand() * 2.4) * base),
        jobsDelayed: rand() < 0.18 * base ? 1 : 0,
        deficienciesCreated: Math.round(rand() * 2 * base),
        deficienciesResolved: Math.round(rand() * 2 * base),
        inspections,
        inspectionsPassed: Math.max(0, inspections - (rand() < 0.3 ? 1 : 0)),
        hours: +(weekend ? rand() * 3 : 6 + rand() * 4).toFixed(1),
      });
    }
  }
  cache = rows;
  return rows;
}

/** Future: GET /api/reports?from=&to=&project=&highway=&crew= */
export const reportService = {
  query(f: ReportFilters): ReportRow[] {
    const all = dataset();
    const cutoff = new Date("2026-10-08T23:59:00-07:00").getTime() - f.days * 86400000;
    return all.filter(
      (r) =>
        new Date(r.date).getTime() > cutoff &&
        (f.projectId === "all" || r.projectId === f.projectId) &&
        (f.highway === "all" || r.highway === f.highway) &&
        (f.crewId === "all" || r.crewId === f.crewId),
    );
  },
  byDay(rows: ReportRow[]) {
    const map = new Map<string, ReportRow & { label: string }>();
    for (const r of rows) {
      const key = r.date.slice(0, 10);
      const cur = map.get(key);
      if (!cur) map.set(key, { ...r, label: key });
      else
        map.set(key, {
          ...cur,
          jobsCompleted: cur.jobsCompleted + r.jobsCompleted,
          jobsDelayed: cur.jobsDelayed + r.jobsDelayed,
          deficienciesCreated: cur.deficienciesCreated + r.deficienciesCreated,
          deficienciesResolved: cur.deficienciesResolved + r.deficienciesResolved,
          inspections: cur.inspections + r.inspections,
          inspectionsPassed: cur.inspectionsPassed + r.inspectionsPassed,
          hours: cur.hours + r.hours,
        });
    }
    return [...map.values()];
  },
  /** Completed jobs over the last 7 days (dashboard), including live completions today. */
  weeklyCompletion() {
    const days = this.byDay(this.query({ days: 7, projectId: "all", highway: "all", crewId: "all" }));
    const liveToday = appStore.getState().jobs.filter((j) => j.status === "Completed").length;
    return days.map((d, i) => ({ date: d.date, completed: d.jobsCompleted + (i === days.length - 1 ? liveToday : 0) }));
  },
  toCsv(rows: ReportRow[]): string {
    const header = ["date", "highway", "crew", "project", "jobs_completed", "jobs_delayed", "deficiencies_created", "deficiencies_resolved", "inspections", "inspections_passed", "hours"];
    const lines = rows.map((r) =>
      [r.date.slice(0, 10), r.highway, r.crewId, r.projectId, r.jobsCompleted, r.jobsDelayed, r.deficienciesCreated, r.deficienciesResolved, r.inspections, r.inspectionsPassed, r.hours].join(","),
    );
    return [header.join(","), ...lines].join("\n");
  },
};
