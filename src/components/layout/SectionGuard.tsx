import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { canView, type Section } from "@/lib/permissions";
import { useSession } from "@/hooks/useSession";

export function SectionGuard({ section, children }: { section: Section; children: ReactNode }) {
  const { role } = useSession();
  const navigate = useNavigate();
  const allowed = canView(role, section);

  useEffect(() => {
    if (!allowed) void navigate({ to: "/dashboard", replace: true });
  }, [allowed, navigate]);

  return allowed ? children : null;
}
