import { BarChart3, ClipboardCheck, ClipboardList, HardHat, LayoutDashboard, Map, RefreshCw, Settings, TriangleAlert, Users } from "lucide-react";
import type { Section } from "@/lib/permissions";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard, section: "dashboard", group: "Operations" },
  { to: "/work-orders", label: "Work Orders", short: "Orders", icon: ClipboardList, section: "workOrders", group: "Operations" },
  { to: "/jobs", label: "Field Jobs", short: "Jobs", icon: HardHat, section: "jobs", group: "Operations" },
  { to: "/inspections", label: "Inspections", short: "Inspect", icon: ClipboardCheck, section: "inspections", group: "Operations" },
  { to: "/deficiencies", label: "Deficiencies", short: "Issues", icon: TriangleAlert, section: "deficiencies", group: "Operations" },
  { to: "/crews", label: "Crews", short: "Crews", icon: Users, section: "crews", group: "Resources" },
  { to: "/map", label: "Operations Map", short: "Map", icon: Map, section: "map", group: "Resources" },
  { to: "/reports", label: "Reports", short: "Reports", icon: BarChart3, section: "reports", group: "Resources" },
  { to: "/sync", label: "Sync Center", short: "Sync", icon: RefreshCw, section: "sync", group: "System" },
  { to: "/settings", label: "Settings", short: "Settings", icon: Settings, section: "settings", group: "System" },
] as const satisfies readonly { to: string; label: string; short: string; icon: unknown; section: Section; group: string }[];

export type NavItem = (typeof navItems)[number];
export const mobilePrimary: NavItem["to"][] = ["/dashboard", "/jobs", "/map", "/sync"];
