import type { ReactNode } from "react";

/**
 * Outputs inherit the universal Dextwork rail from `(app)/layout.tsx`.
 * Do NOT mount a second sidebar or product shell here.
 */
export default function OutputsLayout({ children }: { children: ReactNode }) {
  return children;
}
