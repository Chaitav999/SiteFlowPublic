import { useHydrated } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { demoUserByRole, users } from "@/data/seed";
import { useAppStore } from "@/store/appStore";
import type { Role } from "@/types";

export function useSession() {
  const storedRole = useAppStore((s) => s.role);
  const role: Role = storedRole ?? "supervisor";
  const sessionUser = useAppStore((s) => s.sessionUser);
  const user = sessionUser ?? users.find((u) => u.id === demoUserByRole[role])!;
  return { role, user, signedIn: storedRole !== null };
}

export function usePendingSyncCount() {
  return useAppStore(
    (s) => s.syncQueue.filter((i) => i.status === "Queued" || i.status === "Failed").length,
  );
}

/** Current time that only ticks after hydration (avoids SSR mismatch). */
export function useNow(intervalMs = 30000): number | null {
  const hydrated = useHydrated();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [hydrated, intervalMs]);
  return now;
}
