/** Client-side demo access code storage (session only). */

export const DEMO_ACCESS_STORAGE_KEY = "forge.demoAccessCode";

export function readDemoAccessCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(DEMO_ACCESS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeDemoAccessCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DEMO_ACCESS_STORAGE_KEY, code);
  } catch {
    // ignore
  }
}

export function clearDemoAccessCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DEMO_ACCESS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function demoAccessHeaders(code: string | null | undefined): HeadersInit {
  if (!code) return {};
  return { "x-demo-access-code": code };
}
