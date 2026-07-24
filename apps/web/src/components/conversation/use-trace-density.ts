"use client";

import { useEffect, useState } from "react";
import type { TraceDensity } from "@/hooks/run-state";

export const TRACE_DENSITY_KEY = "forge.trace-density";

function isDensity(value: string | null): value is TraceDensity {
  return value === "narrative" || value === "detailed" || value === "everything";
}

/** Persist trace density to localStorage under forge.trace-density. */
export function useTraceDensity(defaultValue: TraceDensity = "narrative") {
  const [density, setDensity] = useState<TraceDensity>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TRACE_DENSITY_KEY);
      if (isDensity(saved)) setDensity(saved);
    } catch {
      /* private mode / SSR */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TRACE_DENSITY_KEY, density);
    } catch {
      /* ignore quota */
    }
  }, [density, hydrated]);

  return { density, setDensity } as const;
}
