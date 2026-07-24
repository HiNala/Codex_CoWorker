import { z } from "zod";

export const ProblemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string(),
  instance: z.string().optional(),
  errors: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetails>;

export class IllegalTransitionError extends Error {
  readonly code = "plan.illegal_transition";

  constructor(message: string) {
    super(message);
    this.name = "IllegalTransitionError";
  }
}
