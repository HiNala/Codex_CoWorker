/** Single easing curve for the product. Animate transform + opacity only. */
export const motion = {
  instant: 0.09,
  quick: 0.16,
  standard: 0.24,
  deliberate: 0.36,
  story: 0.9,
  capabilityComplete: 0.9,
  pressAndHoldMs: 600,
  ease: [0.22, 1, 0.36, 1] as const,
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeIn: [0.7, 0, 0.84, 0] as const,
  easeSoft: [0.65, 0, 0.35, 1] as const,
} as const;

export type MotionTokens = typeof motion;

/** CSS custom-property names matching 19-PACK motion tokens. */
export const motionCssVars = {
  instant: "var(--dur-instant)",
  quick: "var(--dur-quick)",
  base: "var(--dur-base)",
  slow: "var(--dur-slow)",
  story: "var(--dur-story)",
  easeOut: "var(--ease-out)",
  easeIn: "var(--ease-in)",
  easeSoft: "var(--ease-soft)",
} as const;
