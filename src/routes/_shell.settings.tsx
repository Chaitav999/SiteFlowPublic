import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DetailRow, PageHeader, Panel } from "@/components/app/primitives";
import { appStore, resetDemoData, useAppStore } from "@/store/appStore";
import { users } from "@/data/seed";
import { useSession } from "@/hooks/useSession";
import { canView, permissionMatrix, roleLabel, type Section } from "@/lib/permissions";
import { pageMeta } from "@/lib/meta";
import { supabaseConfigured } from "@/lib/supabase";
import type { Role } from "@/types";

export const Route = createFileRoute("/_shell/settings")({
  head: () => pageMeta("Settings", "Profile, demo controls, roles and permissions."),
  component: SettingsPage,
});

const roles: Role[] = ["field_worker", "supervisor", "admin"];
const sections: Section[] = [
  "dashboard",
  "workOrders",
  "jobs",
  "inspections",
  "deficiencies",
  "crews",
  "reports",
  "map",
  "sync",
  "users",
];

function SettingsPage() {
  const { user, role } = useSession();
  const failures = useAppStore((s) => s.simulateSyncFailures);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="Settings" />
      <Panel title="Profile">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <DetailRow label="Name">{user.name}</DetailRow>
          <DetailRow label="Title">{user.title}</DetailRow>
          <DetailRow label="Role">{roleLabel[role]}</DetailRow>
          <DetailRow label="Email">{user.email}</DetailRow>
        </dl>
      </Panel>
      {!supabaseConfigured ? (
        <Panel title="Demo controls">
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Simulate sync failures</span>
                <span className="block text-xs text-muted-foreground">
                  About 1 in 3 uploads will fail so you can demo retries.
                </span>
              </span>
              <Switch
                checked={failures}
                onCheckedChange={(v) => appStore.setState(() => ({ simulateSyncFailures: v }))}
              />
            </label>
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Reset demo data</span>
                <span className="block text-xs text-muted-foreground">
                  Restores all work orders, photos and deficiencies to the starting state.
                </span>
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RotateCcw />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Everything you've recorded on this device will be cleared.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        resetDemoData();
                        toast.success("Demo data reset");
                      }}
                    >
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <p className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Data source: local demo data. No real authentication or backend is used.
          </p>
        </Panel>
      ) : (
        <Panel title="Connected data">
          <p className="text-sm text-muted-foreground">
            Signed in with Supabase Auth. siteFlow data is accessed through the Express API and
            stored in Supabase Postgres and private Storage.
          </p>
        </Panel>
      )}
      <Panel title="Roles & permissions" bodyClassName="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area</TableHead>
              {roles.map((r) => (
                <TableHead key={r} className="text-center">
                  {roleLabel[r]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((s) => (
              <TableRow key={s}>
                <TableCell className="font-medium capitalize">
                  {s.replace(/([A-Z])/g, " $1")}
                </TableCell>
                {roles.map((r) => (
                  <TableCell key={r} className="text-center">
                    {canView(r, s) ? (
                      <Check className="mx-auto size-4 text-success" aria-label="Allowed" />
                    ) : (
                      <Minus
                        className="mx-auto size-4 text-muted-foreground"
                        aria-label="Not allowed"
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {(
              [
                "approveWork",
                "assignCrews",
                "verifyDeficiency",
                "exportReports",
                "manageUsers",
              ] as const
            ).map((c) => (
              <TableRow key={c}>
                <TableCell className="font-medium capitalize">
                  {c.replace(/([A-Z])/g, " $1")}
                </TableCell>
                {roles.map((r) => (
                  <TableCell key={r} className="text-center">
                    {permissionMatrix.capabilities[r].includes(c) ? (
                      <Check className="mx-auto size-4 text-success" aria-label="Allowed" />
                    ) : (
                      <Minus
                        className="mx-auto size-4 text-muted-foreground"
                        aria-label="Not allowed"
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      {!supabaseConfigured && canView(role, "users") && (
        <Panel title="Users" bodyClassName="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Crew</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.title}</TableCell>
                  <TableCell>{roleLabel[u.role]}</TableCell>
                  <TableCell className="font-mono text-xs">{u.crewId ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  );
}
