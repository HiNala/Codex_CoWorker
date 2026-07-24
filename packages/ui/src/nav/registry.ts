export interface NavigationEntry {
  label: string;
  href: string;
}

export const navigationRegistry: NavigationEntry[] = [
  // <anchor:D>
  { label: "Home", href: "/" },
  { label: "Assignments", href: "/assignments" },
  // </anchor:D>
  // <anchor:E>
  { label: "Outputs", href: "/outputs" },
  // </anchor:E>
  // <anchor:F>
  { label: "Integrations", href: "/settings/integrations" },
  // </anchor:F>
  // <anchor:J>
  { label: "Demo", href: "/demo" },
  // </anchor:J>
  // <anchor:K>
  { label: "Settings", href: "/settings" },
  // </anchor:K>
];
