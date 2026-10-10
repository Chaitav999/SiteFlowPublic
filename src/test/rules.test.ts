import { describe, expect, it } from "vitest";
import { evaluateInspection } from "@/services/fieldDataService";
import { can, canView } from "@/lib/permissions";
import { nextId } from "@/utils/format";

describe("inspection outcome", () => {
  it("fails when damage is observed", () => {
    expect(evaluateInspection({ guardrail: "Good", damage: "Yes" })).toBe("Failed");
  });
  it("fails on a Poor condition", () => {
    expect(evaluateInspection({ guardrail: "Poor", damage: "No" })).toBe("Failed");
  });
  it("passes when everything is good", () => {
    expect(evaluateInspection({ guardrail: "Good", posts: "Good", reflectors: "Yes", damage: "No" })).toBe("Passed");
  });
});

describe("role permissions", () => {
  it("hides reports from field workers", () => {
    expect(canView("field_worker", "reports")).toBe(false);
  });
  it("only admins manage users", () => {
    expect(can("supervisor", "manageUsers")).toBe(false);
    expect(can("admin", "manageUsers")).toBe(true);
  });
});

describe("ids", () => {
  it("continues the sequence", () => {
    expect(nextId("DEF", [{ id: "DEF-207" }, { id: "DEF-208" }])).toBe("DEF-209");
  });
});
