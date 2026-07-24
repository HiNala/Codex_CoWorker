"use client";

import { useEffect, useRef, useState } from "react";

export interface LiveRegionProps {
  message: string | null;
  /** Throttle to one announcement per second (default). */
  throttleMs?: number;
}

/**
 * Polite live region for status changes. Throttled so token streams
 * do not flood assistive tech.
 */
export function LiveRegion({ message, throttleMs = 1000 }: LiveRegionProps) {
  const [announced, setAnnounced] = useState("");
  const lastAt = useRef(0);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    const now = Date.now();
    const elapsed = now - lastAt.current;

    const speak = (text: string) => {
      lastAt.current = Date.now();
      setAnnounced(text);
    };

    if (elapsed >= throttleMs) {
      speak(message);
      return;
    }

    pending.current = message;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (pending.current) speak(pending.current);
      pending.current = null;
    }, throttleMs - elapsed);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message, throttleMs]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {announced}
    </div>
  );
}
