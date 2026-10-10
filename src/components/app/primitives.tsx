import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types";
import { fmtDateTime, timeAgo } from "@/utils/format";
import { useNow } from "@/hooks/useSession";

const toneMap: Record<string, Tone> = {
  Completed: "success", Synced: "success", Passed: "success", Verified: "success", Resolved: "success", Good: "success", Available: "success", synced: "success", Online: "success",
  "In Progress": "info", Uploading: "info", "En Route": "info", "On Site": "info", Medium: "info",
  Assigned: "neutral", Pending: "neutral", Low: "neutral", Queued: "neutral", "Off Shift": "neutral",
  "Awaiting Review": "warning", Paused: "warning", Open: "warning", High: "warning", Fair: "warning", pending: "warning", Offline: "warning",
  Blocked: "critical", Failed: "critical", Critical: "critical", Delayed: "critical", Poor: "critical",
};

export const toneFor = (v: string): Tone => toneMap[v] ?? "neutral";

export const toneText: Record<Tone, string> = {
  success: "text-success", warning: "text-warning", critical: "text-critical", info: "text-info", neutral: "text-neutral",
};
export const toneBg: Record<Tone, string> = {
  success: "bg-success", warning: "bg-warning", critical: "bg-critical", info: "bg-info", neutral: "bg-neutral",
};
const toneBadge: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-critical/10 text-critical border-critical/25",
  info: "bg-info/10 text-info border-info/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ value, tone, label, className }: { value: string; tone?: Tone; label?: string; className?: string }) {
  const t = tone ?? toneFor(value);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", toneBadge[t], className)}>
      <span className={cn("size-1.5 rounded-full", toneBg[t])} aria-hidden />
      {label ?? value}
    </span>
  );
}

export function SyncFlag({ status }: { status: "synced" | "pending" }) {
  if (status === "synced") return null;
  return <StatusBadge value="pending" label="Saved offline" />;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClassName }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("surface", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, icon: Icon, tone = "neutral", hint }: { label: string; value: ReactNode; icon: LucideIcon; tone?: Tone; hint?: string }) {
  return (
    <div className="surface flex items-start justify-between gap-3 p-4">
      <div>
        <p className="eyebrow">{label}</p>
        <p className="mt-2 font-tabular text-3xl font-semibold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <span className={cn("rounded-md p-2", toneText[tone], toneBadge[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <p className="mt-3 font-medium text-foreground">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function TimeAgo({ iso }: { iso: string }) {
  const now = useNow();
  return <time dateTime={iso} title={fmtDateTime(iso)}>{now ? timeAgo(iso, now) : fmtDateTime(iso)}</time>;
}

export interface TimelineItem {
  id: string;
  time: string;
  title: ReactNode;
  body?: ReactNode;
  tone?: Tone;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-4">
      {items.map((it, idx) => (
        <li key={it.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span className={cn("mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-card", toneBg[it.tone ?? "neutral"])} />
            {idx < items.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="min-w-0 pb-1">
            <p className="font-mono text-xs text-muted-foreground">{it.time}</p>
            <p className="text-sm text-foreground">{it.title}</p>
            {it.body && <p className="text-xs text-muted-foreground">{it.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function IdTag({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs font-medium text-muted-foreground">{children}</span>;
}
