/**
 * Deterministic deep equality for trusted fixture comparison.
 * Objects are compared by own enumerable keys (order-independent).
 * Arrays are order-sensitive. NaN equals NaN.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
  }
  for (const key of aKeys) {
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

export function deepEqualDiff(a: unknown, b: unknown, path = "$"): string | null {
  if (deepEqual(a, b)) return null;
  if (typeof a !== typeof b) {
    return `${path}: type ${typeof a} !== ${typeof b}`;
  }
  if (a === null || b === null || typeof a !== "object") {
    return `${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return `${path}: array/non-array mismatch`;
    }
    if (a.length !== b.length) {
      return `${path}: length ${a.length} !== ${b.length}`;
    }
    for (let i = 0; i < a.length; i++) {
      const d = deepEqualDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return `${path}: array mismatch`;
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const key of [...keys].sort()) {
    if (!(key in aObj)) return `${path}.${key}: missing in actual`;
    if (!(key in bObj)) return `${path}.${key}: missing in expected`;
    const d = deepEqualDiff(aObj[key], bObj[key], `${path}.${key}`);
    if (d) return d;
  }
  return `${path}: object mismatch`;
}
