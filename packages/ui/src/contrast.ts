/** Relative luminance and WCAG contrast helpers for OKLCH-ish token pairs. */

export function parseOklch(input: string): { l: number; c: number; h: number; a: number } | null {
  const m = input
    .trim()
    .match(
      /^oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\)$/i,
    );
  if (!m) return null;
  const aRaw = m[4];
  let a = 1;
  if (aRaw) {
    a = aRaw.endsWith("%") ? Number(aRaw.slice(0, -1)) / 100 : Number(aRaw);
  }
  return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]), a };
}

/** Approximate sRGB relative luminance from OKLCH L (good enough for AA checks). */
export function approxRelativeLuminance(oklchL: number): number {
  // OKLCH L is roughly perceptual; map to WCAG-ish Y for contrast ratios.
  const l = Math.min(1, Math.max(0, oklchL));
  return l <= 0.5 ? 2 * l * l : 1 - 2 * (1 - l) * (1 - l);
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsAa(fg: string, bg: string, largeText = false): boolean {
  const f = parseOklch(fg);
  const b = parseOklch(bg);
  if (!f || !b) return false;
  const ratio = contrastRatio(approxRelativeLuminance(f.l), approxRelativeLuminance(b.l));
  return ratio >= (largeText ? 3 : 4.5);
}
