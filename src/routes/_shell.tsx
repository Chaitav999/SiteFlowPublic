import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar, MobileNav, OfflineBanner, TopBar } from "@/components/layout/AppChrome";
import { useAppStore } from "@/store/appStore";
import { supabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const navigate = useNavigate();
  const role = useAppStore((state) => state.role);
  const sessionReady = useAppStore((state) => state.sessionReady);
  useEffect(() => {
    if (supabaseConfigured && sessionReady && !role) navigate({ to: "/" });
  }, [navigate, role, sessionReady]);

  if (supabaseConfigured && (!sessionReady || !role)) return null;

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <OfflineBanner />
        <main
          id="main"
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-7"
        >
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
