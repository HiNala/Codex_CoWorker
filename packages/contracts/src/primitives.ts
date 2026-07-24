import { z } from "zod";

export const Id = z.string().uuid();
export const Ts = z.iso.datetime({ offset: true });
export const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const SemVer = z.string().regex(/^\d+\.\d+\.\d+$/);
export const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const Microcredits = z.number().int().nonnegative();
export const Microdollars = z.number().int();

export type Id = z.infer<typeof Id>;
export type Ts = z.infer<typeof Ts>;
export type Slug = z.infer<typeof Slug>;
export type SemVer = z.infer<typeof SemVer>;
export type Microcredits = z.infer<typeof Microcredits>;
export type Microdollars = z.infer<typeof Microdollars>;
