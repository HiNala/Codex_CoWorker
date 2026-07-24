import { describe, expect, it } from "vitest";
import { contrastRatio, meetsAa, parseOklch, approxRelativeLuminance } from "./contrast";

/** Dark theme critical pairs from tokens.css */
const DARK_PAIRS: Array<[string, string, string]> = [
  ["foreground/background", "oklch(0.975 0.003 100)", "oklch(0.095 0.004 270)"],
  ["foreground/card", "oklch(0.975 0.003 100)", "oklch(0.135 0.006 270)"],
  ["muted-foreground/background", "oklch(0.7 0.008 270)", "oklch(0.095 0.004 270)"],
  ["primary-on-bg", "oklch(0.72 0.15 255)", "oklch(0.095 0.004 270)"],
  ["success-on-bg", "oklch(0.76 0.16 150)", "oklch(0.095 0.004 270)"],
  ["danger-on-bg", "oklch(0.68 0.19 25)", "oklch(0.095 0.004 270)"],
];

const LIGHT_PAIRS: Array<[string, string, string]> = [
  ["foreground/background", "oklch(0.14 0.006 270)", "oklch(0.985 0.004 100)"],
  ["foreground/card", "oklch(0.14 0.006 270)", "oklch(1 0 0)"],
  ["muted-foreground/background", "oklch(0.45 0.01 270)", "oklch(0.985 0.004 100)"],
];

describe("token contrast AA", () => {
  for (const [name, fg, bg] of DARK_PAIRS) {
    it(`dark ${name} meets AA`, () => {
      expect(meetsAa(fg, bg)).toBe(true);
    });
  }

  for (const [name, fg, bg] of LIGHT_PAIRS) {
    it(`light ${name} meets AA`, () => {
      expect(meetsAa(fg, bg)).toBe(true);
    });
  }

  it("parses oklch with alpha", () => {
    const p = parseOklch("oklch(0.5 0.1 200 / 40%)");
    expect(p).toEqual({ l: 0.5, c: 0.1, h: 200, a: 0.4 });
  });

  it("contrast ratio is symmetric for luminance swap", () => {
    const a = approxRelativeLuminance(0.9);
    const b = approxRelativeLuminance(0.1);
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a));
  });
});
