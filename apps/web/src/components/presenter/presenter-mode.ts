/**
 * Presenter mode helpers (client-safe).
 * Never hides real state — only emphasises it (type scale, chrome, timer).
 */

export const PRESENTER_STORAGE_KEY = "forge.presenterMode";

export function readPresenterMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PRESENTER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePresenterMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRESENTER_STORAGE_KEY, enabled ? "1" : "0");
    document.documentElement.dataset.presenter = enabled ? "on" : "off";
  } catch {
    // ignore quota / private mode
  }
}

export function togglePresenterMode(): boolean {
  const next = !readPresenterMode();
  writePresenterMode(next);
  return next;
}

export function applyPresenterDom(enabled: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.presenter = enabled ? "on" : "off";
}
