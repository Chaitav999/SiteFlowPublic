import type {
  Crew,
  Deficiency,
  FieldJob,
  Inspection,
  Measurement,
  Notification,
  PhotoEvidence,
  Role,
  User,
  WorkOrder,
} from "@/types";
import { appStore } from "@/store/appStore";
import { apiRequest } from "./apiClient";

const roles: Role[] = ["field_worker", "supervisor", "admin"];

interface RemoteUser {
  userId: string;
  email?: string;
  name?: string;
  initials?: string;
  title?: string;
  role: string;
  crewId?: string;
}

export async function loadRemoteState() {
  const [workOrders, jobs, inspections, deficiencies, photos, measurements, notifications, crews] =
    await Promise.all([
      apiRequest<WorkOrder[]>("/api/work-orders"),
      apiRequest<FieldJob[]>("/api/jobs"),
      apiRequest<Inspection[]>("/api/inspections"),
      apiRequest<Deficiency[]>("/api/deficiencies"),
      apiRequest<PhotoEvidence[]>("/api/photos"),
      apiRequest<Measurement[]>("/api/measurements"),
      apiRequest<Notification[]>("/api/notifications"),
      apiRequest<Crew[]>("/api/crews"),
    ]);
  appStore.setState(() => ({
    workOrders,
    jobs,
    inspections,
    deficiencies,
    photos,
    measurements,
    notifications,
    crews,
  }));
}

export async function getRemoteUser(): Promise<User> {
  const result = await apiRequest<{ user: RemoteUser }>("/api/auth/me");
  const user = result.user;
  if (!roles.includes(user.role as Role)) {
    throw new Error("The signed-in profile has an unsupported siteFlow role.");
  }
  return {
    id: user.userId,
    email: user.email ?? "",
    name: user.name ?? user.email ?? "siteFlow user",
    initials: user.initials ?? "SF",
    title: user.title ?? "siteFlow user",
    role: user.role as Role,
    crewId: user.crewId,
  };
}
