import { z } from "zod";
import { Id } from "./primitives";

export const Session = z.object({
  userId: Id,
  orgId: Id,
  email: z.email(),
  role: z.enum(["owner", "member", "viewer"]),
  displayName: z.string().min(1),
});

export type Session = z.infer<typeof Session>;
export type SessionProvider = (request: Request) => Promise<Session | null>;
