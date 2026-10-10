import { supabase } from "@/lib/supabase";

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
export const remoteApiEnabled = Boolean(apiUrl && supabase);

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiUrl || !supabase) {
    throw new Error(
      "siteFlow API is not configured. Set VITE_API_URL and Supabase public environment variables.",
    );
  }

  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in before accessing siteFlow data.");

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    let message = `siteFlow API request failed (${response.status})`;
    if (typeof payload === "object" && payload !== null && "message" in payload) {
      message = String(payload.message);
      if ("issues" in payload && Array.isArray(payload.issues) && payload.issues.length > 0) {
        const details = payload.issues
          .map((issue: unknown) => {
            if (typeof issue !== "object" || issue === null) return "";
            const validationIssue = issue as { message?: unknown; path?: unknown };
            const path = Array.isArray(validationIssue.path) ? validationIssue.path.join(".") : "";
            const detail =
              typeof validationIssue.message === "string" ? validationIssue.message : "";
            return [path, detail].filter(Boolean).join(": ");
          })
          .filter(Boolean);
        if (details.length > 0) message += ` (${details.join("; ")})`;
      }
    }
    throw new Error(message);
  }
  return payload as T;
}
