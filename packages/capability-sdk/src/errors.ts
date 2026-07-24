/**
 * Thrown when capability input fails validation.
 * Code is stable so sandboxes and the verifier can classify failures.
 */
export class CapabilityInputError extends Error {
  readonly code = "capability.invalid_input" as const;

  constructor(message: string) {
    super(message);
    this.name = "CapabilityInputError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
