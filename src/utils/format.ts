/** All dates render in the operating region's timezone so SSR and browser match. */
const TZ = "America/Vancouver";

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: TZ });
const shortDateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: TZ });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: TZ });

export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtDate = (iso: string) => dateFmt.format(new Date(iso));
export const fmtShortDate = (iso: string) => shortDateFmt.format(new Date(iso));
export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`;
export const fmtWeekday = (iso: string) => weekdayFmt.format(new Date(iso));
export const fmtCoord = (n: number) => n.toFixed(4);

export function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const nowIso = () => new Date().toISOString();

/** Sequential, human-readable IDs (WO-2094, DEF-209 …) without randomness. */
export function nextId(prefix: string, existing: { id: string }[], start = 1): string {
  let max = start - 1;
  for (const { id } of existing) {
    if (!id.startsWith(prefix + "-")) continue;
    const n = parseInt(id.slice(prefix.length + 1), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}-${max + 1}`;
}
