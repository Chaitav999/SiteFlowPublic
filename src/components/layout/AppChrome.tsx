import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { canView, roleLabel } from "@/lib/permissions";
import { useAppStore } from "@/store/appStore";
import { notificationService, sessionService, syncService } from "@/services";
import { usePendingSyncCount, useSession } from "@/hooks/useSession";
import { TimeAgo, toneBg } from "@/components/app/primitives";
import { mobilePrimary, navItems } from "./nav";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="hazard-stripe grid size-8 place-items-center rounded-md" aria-hidden>
        <span className="grid size-5 place-items-center rounded-sm bg-sidebar font-mono text-[10px] font-bold text-brand">
          SF
        </span>
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold tracking-[0.18em]">siteFlow</span>
        <span className="block text-[10px] uppercase tracking-wider opacity-60">
          Field Operations
        </span>
      </span>
    </div>
  );
}

function useVisibleNav() {
  const { role } = useSession();
  return navItems.filter((i) => canView(role, i.section));
}

export function AppSidebar() {
  const items = useVisibleNav();
  const pending = usePendingSyncCount();
  const { user, role } = useSession();
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="px-5 py-5">
        <BrandMark />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
        {groups.map((g) => (
          <div key={g} className="mb-5">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {g}
            </p>
            <ul className="space-y-0.5">
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <li key={i.to}>
                    <Link
                      to={i.to}
                      className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeProps={{
                        className:
                          "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_var(--brand)]",
                      }}
                    >
                      <i.icon className="size-4" aria-hidden />
                      <span className="flex-1">{i.label}</span>
                      {i.to === "/sync" && pending > 0 && (
                        <span className="rounded bg-brand px-1.5 font-mono text-[10px] font-bold text-brand-foreground">
                          {pending}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md p-2">
          <span className="grid size-9 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold">
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-sidebar-muted">{roleLabel[role]}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function ConnectionToggle() {
  const online = useAppStore((s) => s.online);
  const pending = usePendingSyncCount();
  const navigate = useNavigate();
  const toggle = (next: boolean) => {
    syncService.setOnline(next);
    if (!next)
      toast.warning("You're offline", {
        description: "Your changes are saved locally and will sync when connection returns.",
      });
    else if (pending > 0)
      toast.info(`${pending} change${pending === 1 ? "" : "s"} ready to sync`, {
        action: { label: "Sync now", onClick: () => navigate({ to: "/sync" }) },
      });
    else toast.success("Back online");
  };
  return (
    <label
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold tracking-wide",
        online
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
      <span>{online ? "ONLINE" : "OFFLINE"}</span>
      <Switch
        checked={online}
        onCheckedChange={toggle}
        aria-label="Toggle connection (demo)"
        className="scale-75"
      />
    </label>
  );
}

function NotificationsMenu() {
  const notifications = useAppStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
    } catch (error) {
      toast.error("Could not update notifications", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };
  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
    } catch (error) {
      toast.error("Could not update notification", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications, ${unread} unread`}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-critical px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => void markAllRead()}
          >
            Mark all read
          </button>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {notifications.slice(0, 12).map((n) => (
            <li key={n.id}>
              <button
                className={cn(
                  "flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-accent",
                  !n.read && "bg-info/5",
                )}
                onClick={() => {
                  void markRead(n.id);
                  setOpen(false);
                  if (n.link?.kind === "deficiency" && n.link.id)
                    navigate({ to: "/deficiencies/$id", params: { id: n.link.id } });
                  else if (n.link?.kind === "workOrder" && n.link.id)
                    navigate({ to: "/work-orders/$id", params: { id: n.link.id } });
                  else if (n.link?.kind === "sync") navigate({ to: "/sync" });
                }}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneBg[n.tone])} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{n.title}</span>
                  <span className="block text-xs text-muted-foreground">{n.body}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    <TimeAgo iso={n.at} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function TopBar() {
  const { user, role } = useSession();
  const navigate = useNavigate();
  const signOut = async () => {
    try {
      await sessionService.signOut();
      navigate({ to: "/" });
    } catch (error) {
      toast.error("Could not sign out", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/95 px-4 backdrop-blur lg:px-8">
      <div className="lg:hidden">
        <BrandMark className="text-foreground" />
      </div>
      <div className="flex-1" />
      <ConnectionToggle />
      <NotificationsMenu />
      <div className="hidden items-center gap-2 sm:flex">
        <span className="rounded-md border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {roleLabel[role]}
        </span>
        <span
          className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          title={user.name}
        >
          {user.initials}
        </span>
      </div>
      <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}>
        <LogOut />
      </Button>
    </header>
  );
}

export function OfflineBanner() {
  const online = useAppStore((s) => s.online);
  const pending = usePendingSyncCount();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm font-medium text-warning lg:px-8"
    >
      <WifiOff className="size-4 shrink-0" />
      <span className="flex-1">Offline mode — changes will sync when connection is restored.</span>
      {pending > 0 && (
        <Link to="/sync" className="font-mono text-xs underline">
          {pending} pending
        </Link>
      )}
    </div>
  );
}

export function MobileNav() {
  const items = useVisibleNav();
  const pending = usePendingSyncCount();
  const [more, setMore] = useState(false);
  const primary = items.filter((i) => mobilePrimary.includes(i.to));
  const rest = items.filter((i) => !mobilePrimary.includes(i.to));
  const linkCls =
    "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground";
  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {primary.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            className={linkCls}
            activeProps={{ className: "text-primary" }}
          >
            <span className="relative">
              <i.icon className="size-6" />
              {i.to === "/sync" && pending > 0 && (
                <span className="absolute -right-2 -top-1 rounded-full bg-brand px-1 font-mono text-[10px] font-bold text-brand-foreground">
                  {pending}
                </span>
              )}
            </span>
            {i.short}
          </Link>
        ))}
        <button className={linkCls} onClick={() => setMore(true)}>
          <Menu className="size-6" />
          More
        </button>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <ul className="grid grid-cols-3 gap-2 p-4">
            {rest.map((i) => (
              <li key={i.to}>
                <Link
                  to={i.to}
                  onClick={() => setMore(false)}
                  className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border text-xs font-medium hover:bg-accent"
                >
                  <i.icon className="size-6" />
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
