import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, HardHat, ShieldCheck, UserCog } from "lucide-react";
import hero from "@/assets/login-hero.jpg";
import { BrandMark } from "@/components/layout/AppChrome";
import { sessionService } from "@/services";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseConfigured } from "@/lib/supabase";
import { remoteApiEnabled } from "@/services/apiClient";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "siteFlow — Field Operations & Maintenance" },
      {
        name: "description",
        content:
          "Connect the field to the office: work orders, inspections, deficiencies and offline-first field capture for highway maintenance.",
      },
      { property: "og:title", content: "siteFlow — Field Operations & Maintenance" },
      {
        property: "og:description",
        content: "Offline-first field operations platform for highway maintenance crews.",
      },
    ],
  }),
  component: EntryScreen,
});

const roles: {
  role: Role;
  title: string;
  body: string;
  icon: typeof HardHat;
  to: "/jobs" | "/dashboard";
}[] = [
  {
    role: "field_worker",
    title: "Continue as Field Worker",
    body: "Alex Chen · Crew 12 — today's jobs, inspections, photos",
    icon: HardHat,
    to: "/jobs",
  },
  {
    role: "supervisor",
    title: "Continue as Supervisor",
    body: "Jordan Lee — dashboard, approvals, crews, reports",
    icon: ShieldCheck,
    to: "/dashboard",
  },
  {
    role: "admin",
    title: "Continue as Administrator",
    body: "Priya Sandhu — full access, users & settings",
    icon: UserCog,
    to: "/dashboard",
  },
];

function EntryScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signUp, setSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");

  const onAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setAuthError("");
    setNotice("");
    try {
      if (signUp) {
        const result = await sessionService.signUp(name, email, password);
        if (result.confirmationRequired) {
          setNotice("Account created. Confirm your email, then sign in.");
          setSignUp(false);
          return;
        }
        navigate({ to: result.user.role === "field_worker" ? "/jobs" : "/dashboard" });
      } else {
        const user = await sessionService.signIn(email, password);
        navigate({ to: user.role === "field_worker" ? "/jobs" : "/dashboard" });
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <img
          src={hero}
          alt="Highway through the BC Interior at dawn with a maintenance truck"
          width={1024}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-sidebar-foreground">
          <p className="eyebrow text-brand">Thompson–Okanagan District</p>
          <p className="mt-2 max-w-md text-3xl font-semibold leading-tight">
            Connect the field to the office.
          </p>
          <p className="mt-3 max-w-md text-sm text-sidebar-muted">
            Work orders, inspections, GPS and photo evidence — captured at the roadside, even
            without signal.
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center bg-background px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 inline-flex rounded-lg bg-sidebar p-3 text-sidebar-foreground">
            <BrandMark />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">siteFlow</h1>
          <p className="mt-1 text-muted-foreground">Field Operations & Maintenance</p>
          {remoteApiEnabled ? (
            <>
              <p className="mt-8 eyebrow">{signUp ? "Create an account" : "Sign in"}</p>
              <form className="mt-3 space-y-4" onSubmit={onAuthSubmit}>
                {signUp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-name">Name</Label>
                    <Input
                      id="auth-name"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete={signUp ? "new-password" : "current-password"}
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                {authError && (
                  <p role="alert" className="text-sm text-destructive">
                    {authError}
                  </p>
                )}
                {notice && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {notice}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Please wait..." : signUp ? "Create account" : "Sign in"}
                </Button>
              </form>
              <button
                type="button"
                className="mt-4 text-sm text-primary hover:underline"
                onClick={() => {
                  setSignUp((value) => !value);
                  setAuthError("");
                  setNotice("");
                }}
              >
                {signUp ? "Already have an account? Sign in" : "Create an account"}
              </button>
              <p className="mt-10 text-xs text-muted-foreground">
                New accounts start as Field Workers. An administrator can assign a different role.
              </p>
            </>
          ) : supabaseConfigured ? (
            <p
              role="alert"
              className="mt-8 rounded-md border border-critical/30 bg-critical/5 p-3 text-sm text-critical"
            >
              Supabase Auth is configured, but the siteFlow API URL is missing. Set VITE_API_URL
              before signing in.
            </p>
          ) : (
            <>
              <p className="mt-8 eyebrow">Choose a demo role</p>
              <ul className="mt-3 space-y-3">
                {roles.map((r) => (
                  <li key={r.role}>
                    <button
                      onClick={() => {
                        sessionService.signInAs(r.role);
                        navigate({ to: r.to });
                      }}
                      className="surface group flex w-full items-center gap-4 p-4 text-left transition-all hover:border-primary hover:shadow-md"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <r.icon className="size-6" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold">{r.title}</span>
                        <span className="block text-sm text-muted-foreground">{r.body}</span>
                      </span>
                      <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-10 text-xs text-muted-foreground">
                Demo environment — no real authentication. Portfolio project with fictional data;
                not affiliated with any company.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
