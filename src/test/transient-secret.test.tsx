import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTransientSecret } from "../lib/vault/use-transient-secret";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("transient credential lifetime", () => {
  it("clears a revealed synthetic value after 20 seconds", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientSecret<string>("account-a"));
    await act(async () => { await result.current.request(async () => "synthetic"); });
    expect(result.current.secret).toBe("synthetic");
    act(() => vi.advanceTimersByTime(20_000));
    expect(result.current.secret).toBeNull();
  });
  it("clears revealed credentials when the window loses focus", async () => {
    const { result } = renderHook(() => useTransientSecret<string>("account-a"));
    await act(async () => { await result.current.request(async () => "synthetic"); });
    act(() => window.dispatchEvent(new Event("blur")));
    expect(result.current.secret).toBeNull();
  });
  it("discards in-flight reveals after concealment", async () => {
    const { result } = renderHook(() => useTransientSecret<string>("account-a"));
    let resolve: (value: string) => void = () => {};
    const deferred = new Promise<string>((done) => { resolve = done; });
    let pending: Promise<string | null> = Promise.resolve(null);
    act(() => { pending = result.current.request(() => deferred); });
    act(() => result.current.clear());
    await act(async () => { resolve("synthetic"); await pending; });
    expect(await pending).toBeNull();
    expect(result.current.secret).toBeNull();
  });
  it("does not retain values fetched for copy only", async () => {
    const { result } = renderHook(() => useTransientSecret<string>("account-a"));
    await act(async () => { expect(await result.current.request(async () => "synthetic", false)).toBe("synthetic"); });
    expect(result.current.secret).toBeNull();
  });
});