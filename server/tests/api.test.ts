import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

const originalEnv = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
};

beforeAll(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
});

afterAll(() => {
  if (originalEnv.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalEnv.url;
  if (originalEnv.anonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
  else process.env.SUPABASE_ANON_KEY = originalEnv.anonKey;
  if (originalEnv.publishableKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
  else process.env.SUPABASE_PUBLISHABLE_KEY = originalEnv.publishableKey;
});

describe("siteFlow API", () => {
  it("provides health and Supabase configuration status", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe("siteflow-api");
    expect(response.body.supabaseConfigured).toBe(false);
  });

  it("rejects protected routes without a bearer token", async () => {
    const response = await request(app).get("/api/work-orders");
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });

  it("validates login input before contacting Supabase", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "short" });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Request validation failed");
  });

  it("reports missing Supabase configuration instead of issuing a demo token", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "field@example.test", password: "not-a-real-password" });
    expect(response.status).toBe(503);
    expect(response.body.message).toMatch(/Supabase is not configured/);
  });
});
