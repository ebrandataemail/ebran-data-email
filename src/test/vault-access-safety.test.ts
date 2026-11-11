import { describe, expect, it } from "vitest";
import { accountUrlInput, passwordInput, safeAccountUrl } from "../lib/vault/access-safety";

describe("account access safety", () => {
  it("blocks executable and non-web login links", () => {
    for (const value of ["javascript:alert(1)", "data:text/html,test", "file:///tmp/test", "//example.com", "not a url"]) {
      expect(safeAccountUrl(value)).toBeNull();
      expect(() => accountUrlInput(value)).toThrow();
    }
  });
  it("blocks credentials embedded in login links", () => {
    expect(safeAccountUrl("https://user:synthetic@example.com/login")).toBeNull();
    expect(safeAccountUrl("https://user@example.com/login")).toBeNull();
  });
  it("preserves valid HTTP and HTTPS navigation", () => {
    expect(accountUrlInput("https://example.com/login?next=dashboard")).toBe("https://example.com/login?next=dashboard");
    expect(accountUrlInput("http://localhost:3000/login")).toBe("http://localhost:3000/login");
    expect(accountUrlInput(null)).toBeNull();
  });
  it("preserves synthetic passwords exactly including whitespace", () => {
    expect(passwordInput(" synthetic example \n")).toBe(" synthetic example \n");
    expect(passwordInput(null)).toBeNull();
  });
  it("rejects oversized passwords instead of truncating them", () => {
    expect(() => passwordInput("x".repeat(201), 200)).toThrow();
  });
});