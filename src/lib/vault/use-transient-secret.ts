import { useEffect, useRef, useState } from "react";

/** Clear revealed credentials on expiry, tab hiding, window blur and unmount.
 * The generation guard discards a reveal that resolves after any of those events. */
export function useTransientSecret<T>(identity: string) {
  const [secret, setSecret] = useState<T | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    generation.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setSecret(null);
  };
  useEffect(() => {
    mounted.current = true;
    clear();
    const hide = () => { if (document.hidden) clear(); };
    window.addEventListener("blur", clear);
    window.addEventListener("pagehide", clear);
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      generation.current += 1;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("blur", clear);
      window.removeEventListener("pagehide", clear);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [identity]);
  const request = async (fetcher: () => Promise<T | null>, display = true) => {
    const version = ++generation.current;
    const result = await fetcher();
    if (!mounted.current || version !== generation.current || document.hidden) return null;
    if (display && result !== null) {
      if (timer.current) clearTimeout(timer.current);
      setSecret(result);
      timer.current = setTimeout(clear, 20_000);
    }
    return result;
  };
  return { secret, clear, request };
}