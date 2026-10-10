import { describe, expect, it } from "vitest";
import { canView } from "@/lib/permissions";

describe("section permissions", () => {
  it("blocks field workers from crews and reports", () => {
    expect(canView("field_worker", "crews")).toBe(false);
    expect(canView("field_worker", "reports")).toBe(false);
  });

  it("allows supervisors to view crews and reports", () => {
    expect(canView("supervisor", "crews")).toBe(true);
    expect(canView("supervisor", "reports")).toBe(true);
  });
});
