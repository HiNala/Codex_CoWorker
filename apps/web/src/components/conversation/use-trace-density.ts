"use client";

import { useCallback, useState } from "react";
import type { TraceDensity } from "@/hooks/run-state";

export const TRACE_DENSITY_KEY = "forge.trace-density";

function isDensity(value: string | null): value is TraceDensity {
  return value === "narrative" || value === "detailed" || value === "everything";
}

function readStoredDensity(fallback: TraceDensity): TraceDensity {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(TRACE_DENSITY_KEY);
    if (isDensity(saved)) return saved;
  } catch {
    /* private mode / SSR */
  }
  return fallback;
}

/**
 * Persist trace density to localStorage under forge.trace-density.
 * Lazy init reads storage once (no setState-in-effect). Writes happen on set only.
 */
export function useTraceDensity(defaultValue: TraceDensity = "narrative") {
  const [density, setDensityState] = useState<TraceDensity>(() =>
    readStoredDensity(defaultValue),
  );

  const setDensity = useCallback((next: TraceDensity) => {
    setDensityState(next);
    try {
      localStorage.setItem(TRACE_DENSITY_KEY, next);
    } catch {
      /* ignore quota */
    }
  }, []);

  return { density, setDensity } as const;
}
