import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings",
};

/** Minimal settings so the rail link stays in-product. */
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <h1 className="ops-title text-foreground">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Account and integration settings land with Track K/F. Navigation stays in Dextwork.
      </p>
      <Link
        href="/home"
        className="mt-6 inline-block text-sm font-medium text-[color:var(--ops-signal)] underline-offset-4 hover:underline"
      >
        ← Back to assignments
      </Link>
    </div>
  );
}
