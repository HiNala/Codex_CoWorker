import { CapabilityInputError, assertArray, assertObject } from "@forge/capability-sdk";
import type { Audience, CommitInput, ReleaseNoteInput } from "./types";

function parseCommit(raw: unknown, i: number): CommitInput {
  assertObject(raw, `commits[${i}] must be an object`);
  if (typeof raw.sha !== "string" || raw.sha.length === 0) {
    throw new CapabilityInputError(`commits[${i}].sha must be a non-empty string`);
  }
  if (typeof raw.message !== "string") {
    throw new CapabilityInputError(`commits[${i}].message must be a string`);
  }
  if (typeof raw.author !== "string") {
    throw new CapabilityInputError(`commits[${i}].author must be a string`);
  }
  assertArray(raw.files, `commits[${i}].files must be an array`);
  for (let fi = 0; fi < raw.files.length; fi++) {
    if (typeof raw.files[fi] !== "string") {
      throw new CapabilityInputError(`commits[${i}].files[${fi}] must be a string`);
    }
  }
  return {
    sha: raw.sha,
    message: raw.message,
    author: raw.author,
    files: raw.files as string[],
  };
}

export function validateInput(input: unknown): ReleaseNoteInput {
  assertObject(input, "input must be an object");
  assertArray(input.commits, "commits must be an array");
  if (typeof input.previousTag !== "string" || input.previousTag.length === 0) {
    throw new CapabilityInputError("previousTag must be a non-empty string");
  }
  if (typeof input.newTag !== "string" || input.newTag.length === 0) {
    throw new CapabilityInputError("newTag must be a non-empty string");
  }
  if (input.audience !== "internal" && input.audience !== "customer") {
    throw new CapabilityInputError('audience must be "internal" or "customer"');
  }
  return {
    commits: input.commits.map(parseCommit),
    previousTag: input.previousTag,
    newTag: input.newTag,
    audience: input.audience as Audience,
  };
}
