import { describe, expect, it } from "vitest";
import { intakeAiText, validTaskDate } from "@/lib/workboard/intake-analysis";

describe("Inbox AI source privacy", () => {
  it("removes labelled passwords and bearer credentials before AI context", () => {
    const result = intakeAiText("Revisi banner\nPassword: private-example\nAuthorization: Bearer abc.def.ghi\nAPI key = private-key");
    expect(result).toContain("Revisi banner");
    for (const secret of ["private-example", "abc.def.ghi", "private-key"]) expect(result).not.toContain(secret);
  });
  it("strips URL credentials and secret query parameters", () => {
    const result = intakeAiText("https://user:private-pass@example.com/brief?access_token=private-token&section=design");
    expect(result).not.toContain("private-pass"); expect(result).not.toContain("private-token");
    expect(result).toContain("section=design");
  });
  it("does not invent deadlines or retain invalid dates", () => {
    expect(validTaskDate(null)).toBeNull();
    expect(validTaskDate("2026-02-30")).toBeNull();
    expect(validTaskDate("2026-11-22")).toBe("2026-11-22");
  });
});