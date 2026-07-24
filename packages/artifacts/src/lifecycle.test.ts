import { describe, expect, it } from "vitest";
import { ArtifactStatus, type ArtifactStatus as Status } from "@forge/contracts";
import { ArtifactIllegalTransitionError } from "./errors";
import { assertTransition, canTransition, LEGAL_TRANSITIONS } from "./lifecycle";

describe("artifact lifecycle transitions", () => {
  for (const from of ArtifactStatus.options) {
    for (const to of ArtifactStatus.options) {
      const isLegal = LEGAL_TRANSITIONS[from].includes(to as Status);
      it(`${from} -> ${to} is ${isLegal ? "legal" : "illegal"}`, () => {
        expect(canTransition(from, to)).toBe(isLegal);
        if (isLegal) {
          expect(() => assertTransition(from, to)).not.toThrow();
        } else {
          expect(() => assertTransition(from, to)).toThrow(ArtifactIllegalTransitionError);
          try {
            assertTransition(from, to);
          } catch (err) {
            expect(err).toBeInstanceOf(ArtifactIllegalTransitionError);
            expect((err as ArtifactIllegalTransitionError).code).toBe(
              "artifact.illegal_transition",
            );
          }
        }
      });
    }
  }

  it("self-transitions are never legal", () => {
    for (const status of ArtifactStatus.options) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});
