import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { GeoPoint, Tone } from "@/types";

/** Stylised regional map of the BC Interior (no external tiles / API keys). */
const BOUNDS = { minLat: 49.7, maxLat: 51.05, minLng: -121.55, maxLng: -119.1 };
const W = 1000;
const H = 620;

export const project = ({ lat, lng }: GeoPoint) => ({
  x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W,
  y: ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H,
});

const path = (pts: [number, number][]) =>
  pts.map(([lat, lng], i) => { const p = project({ lat, lng }); return `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");

const towns: { name: string; lat: number; lng: number }[] = [
  { name: "Kamloops", lat: 50.674, lng: -120.327 },
  { name: "Merritt", lat: 50.112, lng: -120.789 },
  { name: "Cache Creek", lat: 50.81, lng: -121.324 },
  { name: "Vernon", lat: 50.267, lng: -119.272 },
  { name: "Kelowna", lat: 49.888, lng: -119.496 },
  { name: "Savona", lat: 50.752, lng: -120.85 },
  { name: "Chase", lat: 50.82, lng: -119.68 },
];

const roads: { id: string; label: string; pts: [number, number][]; labelAt: [number, number] }[] = [
  { id: "1", label: "1", labelAt: [50.73, -121.0], pts: [[50.81, -121.32], [50.75, -120.84], [50.71, -120.55], [50.674, -120.327], [50.65, -119.95], [50.82, -119.68], [50.9, -119.15]] },
  { id: "5", label: "5", labelAt: [50.4, -120.56], pts: [[49.75, -121.2], [50.112, -120.789], [50.35, -120.6], [50.674, -120.327], [50.86, -120.27], [51.05, -120.15]] },
  { id: "97", label: "97", labelAt: [50.48, -119.7], pts: [[51.05, -121.45], [50.81, -121.32]] },
  { id: "97s", label: "97", labelAt: [50.48, -119.7], pts: [[50.65, -119.95], [50.5, -119.83], [50.5, -119.56], [50.267, -119.272], [49.888, -119.496], [49.7, -119.65]] },
  { id: "97C", label: "97C", labelAt: [49.93, -120.3], pts: [[50.112, -120.789], [49.95, -120.62], [49.88, -120.1], [49.77, -119.73], [49.75, -119.7]] },
];

export interface MapMarker {
  id: string;
  kind: "workOrder" | "crew" | "deficiency" | "inspection";
  point: GeoPoint;
  label: string;
  tone: Tone;
}

const toneFill: Record<Tone, string> = {
  success: "fill-success", warning: "fill-warning", critical: "fill-critical", info: "fill-info", neutral: "fill-neutral",
};

function MarkerShape({ m, selected }: { m: MapMarker; selected: boolean }) {
  const cls = cn(toneFill[m.tone], "stroke-card");
  switch (m.kind) {
    case "crew":
      return (<g><circle r={13} className={cn("fill-primary stroke-card")} strokeWidth={2.5} /><text textAnchor="middle" dy={4} className="fill-primary-foreground text-[10px] font-semibold">{m.label.replace("Crew ", "")}</text></g>);
    case "deficiency":
      return <path d="M0,-12 L11,8 L-11,8 Z" className={cls} strokeWidth={2} />;
    case "inspection":
      return <rect x={-8} y={-8} width={16} height={16} transform="rotate(45)" className={cls} strokeWidth={2} />;
    default:
      return <rect x={-9} y={-9} width={18} height={18} rx={3} className={cls} strokeWidth={2} />;
  }
  void selected;
}

interface Props {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (m: MapMarker) => void;
  className?: string;
  focus?: GeoPoint;
}

export function OpsMap({ markers, selectedId, onSelect, className }: Props) {
  const onKey = (e: KeyboardEvent, m: MapMarker) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(m); }
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-full w-full rounded-lg bg-map-land", className)} role="img" aria-label="Operations map of the Thompson–Okanagan highway network">
      <defs>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0 L0 0 0 50" fill="none" className="stroke-map-grid" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      {/* Water */}
      <path d={path([[50.674, -120.327], [50.71, -120.55], [50.75, -120.84], [50.81, -121.32]])} className="stroke-map-water" strokeWidth={4} fill="none" />
      <path d={path([[50.745, -120.52], [50.735, -120.7], [50.755, -120.83]])} className="stroke-map-water" strokeWidth={14} strokeLinecap="round" fill="none" />
      <path d={path([[50.36, -119.33], [50.2, -119.39], [50.0, -119.47], [49.88, -119.53], [49.76, -119.66]])} className="stroke-map-water" strokeWidth={16} strokeLinecap="round" fill="none" />
      <path d={path([[50.2, -120.6], [50.15, -120.5]])} className="stroke-map-water" strokeWidth={8} strokeLinecap="round" fill="none" />
      {/* Roads */}
      {roads.map((r) => (
        <g key={r.id}>
          <path d={path(r.pts)} className="stroke-map-road-casing" strokeWidth={7} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <path d={path(r.pts)} className="stroke-map-road" strokeWidth={3.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}
      {roads.filter((r) => r.id !== "97").map((r) => {
        const p = project({ lat: r.labelAt[0], lng: r.labelAt[1] });
        return (
          <g key={`l${r.id}`} transform={`translate(${p.x},${p.y})`}>
            <rect x={-15} y={-10} width={30} height={20} rx={4} className="fill-sidebar" />
            <text textAnchor="middle" dy={4} className="fill-sidebar-foreground text-[11px] font-bold">{r.label}</text>
          </g>
        );
      })}
      {towns.map((t) => {
        const p = project(t);
        return (
          <g key={t.name} transform={`translate(${p.x},${p.y})`}>
            <circle r={3.5} className="fill-map-label" />
            <text x={7} y={-6} className="fill-map-label text-[13px] font-medium">{t.name}</text>
          </g>
        );
      })}
      {/* Markers */}
      {markers.map((m) => {
        const p = project(m.point);
        const sel = m.id === selectedId;
        return (
          <g key={`${m.kind}-${m.id}`} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={`${m.kind} ${m.label}`} aria-pressed={sel}
            onClick={() => onSelect?.(m)} onKeyDown={(e) => onKey(e, m)} className="cursor-pointer outline-none focus-visible:[&>circle:first-child]:stroke-ring">
            {sel && <circle r={22} className="fill-ring/20 stroke-ring" strokeWidth={2} />}
            <MarkerShape m={m} selected={sel} />
          </g>
        );
      })}
    </svg>
  );
}

export function MapLegend() {
  const item = (shape: React.ReactNode, label: string) => (
    <li className="flex items-center gap-1.5"><svg width="18" height="18" viewBox="-12 -12 24 24" aria-hidden>{shape}</svg>{label}</li>
  );
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {item(<rect x={-8} y={-8} width={16} height={16} rx={3} className="fill-info" />, "Work order")}
      {item(<circle r={9} className="fill-primary" />, "Crew")}
      {item(<path d="M0,-10 L9,7 L-9,7 Z" className="fill-critical" />, "Deficiency")}
      {item(<rect x={-6} y={-6} width={12} height={12} transform="rotate(45)" className="fill-warning" />, "Inspection")}
    </ul>
  );
}
