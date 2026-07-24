/** Deterministic visual identity for a capability. Never Math.random(). */

export type GlyphSeed = number;

export interface TileIdentity {
  hue: number;
  hue2: number;
  glyph: GlyphSeed;
}

export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tileIdentity(id: string): TileIdentity {
  const h = fnv1a(id);
  return {
    hue: h % 360,
    hue2: (h >>> 8) % 360,
    glyph: (h >>> 16) & 0xffff,
  };
}

/**
 * 5×5 mirrored lattice: left 3 columns driven by seed bits, mirrored right.
 * Returns 25 booleans row-major.
 */
export function glyphCells(seed: GlyphSeed): boolean[] {
  const cells: boolean[] = new Array(25).fill(false);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const bit = row * 3 + col;
      const on = ((seed >>> bit) & 1) === 1;
      cells[row * 5 + col] = on;
      cells[row * 5 + (4 - col)] = on;
    }
  }
  // Centre column from high bits for extra variety
  for (let row = 0; row < 5; row++) {
    const bit = 15 + row;
    cells[row * 5 + 2] = ((seed >>> bit) & 1) === 1;
  }
  return cells;
}

export function tileHues(id: string): { primary: string; secondary: string } {
  const { hue, hue2 } = tileIdentity(id);
  return {
    primary: `oklch(0.72 0.14 ${hue})`,
    secondary: `oklch(0.62 0.12 ${hue2})`,
  };
}
