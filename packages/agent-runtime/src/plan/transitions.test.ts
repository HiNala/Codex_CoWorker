import { describe, expect, it } from "vitest";
import { PlanStepStatus, type PlanStepStatus as StepStatus } from "@forge/contracts";
import { assertTransition, LEGAL } from "./transitions";

describe("plan transition table", () => {
  for (const from of PlanStepStatus.options) {
    for (const to of PlanStepStatus.options) {
      const isLegal = LEGAL[from].includes(to as StepStatus);
      it(`${from} -> ${to} is ${isLegal ? "legal" : "illegal"}`, () => {
        if (isLegal) {
          expect(() => assertTransition(from, to)).not.toThrow();
        } else {
          expect(() => assertTransition(from, to)).toThrowError(/not a legal plan step transition/);
        }
      });
    }
  }
});
