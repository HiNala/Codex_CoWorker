/**
 * Pure string registry mapping artifact types to renderer keys.
 * React components resolve these keys separately in the web app.
 */
export const artifactRenderers = {
  // <anchor:E>
  "document.markdown": "markdown",
  "table.typed": "typed-table",
  "code.change": "code-change",
  // </anchor:E>
  // <anchor:B>
  "capability.package": "capability-package",
  // </anchor:B>
  // <anchor:J>
  "receipt.assignment": "receipt",
  // </anchor:J>
} as const;

export type RegisteredArtifactType = keyof typeof artifactRenderers;
export type RendererKey = (typeof artifactRenderers)[RegisteredArtifactType] | "fallback";

/**
 * Resolve an artifact type string to a renderer key.
 * Unknown types always map to `"fallback"` — never throw.
 */
export function resolveRenderer(type: string): RendererKey {
  if (Object.prototype.hasOwnProperty.call(artifactRenderers, type)) {
    return artifactRenderers[type as RegisteredArtifactType];
  }
  return "fallback";
}

export function isRegisteredArtifactType(type: string): type is RegisteredArtifactType {
  return Object.prototype.hasOwnProperty.call(artifactRenderers, type);
}
