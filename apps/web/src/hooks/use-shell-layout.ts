"use client";

import { useSyncExternalStore } from "react";

export type ShellLayout = "desktop" | "tablet" | "mobile";

function readLayout(): ShellLayout {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w >= 1280) return "desktop";
  if (w >= 901) return "tablet";
  return "mobile";
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onResize = () => onChange();
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}

/** Exactly one layout bucket — never mount two shells. */
export function useShellLayout(): ShellLayout {
  return useSyncExternalStore(subscribe, readLayout, () => "desktop" as const);
}
