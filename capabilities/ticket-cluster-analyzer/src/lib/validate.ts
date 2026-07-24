import {
  CapabilityInputError,
  assertArray,
  assertObject,
} from "@forge/capability-sdk";
import type { ClusterAnalyzerInput, TicketInput } from "./types";

function parseTicket(raw: unknown, index: number): TicketInput {
  assertObject(raw, `tickets[${index}] must be an object`);
  const { id, subject, body, createdAt, requesterId, tags } = raw;

  if (typeof id !== "string" || id.length === 0) {
    throw new CapabilityInputError(`tickets[${index}].id must be a non-empty string`);
  }
  if (typeof subject !== "string") {
    throw new CapabilityInputError(`tickets[${index}].subject must be a string`);
  }
  if (typeof body !== "string") {
    throw new CapabilityInputError(`tickets[${index}].body must be a string`);
  }
  if (typeof createdAt !== "string") {
    throw new CapabilityInputError(`tickets[${index}].createdAt must be a string`);
  }
  if (typeof requesterId !== "string") {
    throw new CapabilityInputError(`tickets[${index}].requesterId must be a string`);
  }
  assertArray(tags, `tickets[${index}].tags must be an array`);
  for (let i = 0; i < tags.length; i++) {
    if (typeof tags[i] !== "string") {
      throw new CapabilityInputError(`tickets[${index}].tags[${i}] must be a string`);
    }
  }

  return {
    id,
    subject,
    body,
    createdAt,
    requesterId,
    tags: tags as string[],
  };
}

export function validateInput(input: unknown): ClusterAnalyzerInput {
  assertObject(input, "input must be an object");
  assertArray(input.tickets, "tickets must be an array");

  const tickets = input.tickets.map((t, i) => parseTicket(t, i));

  // Duplicate ids are invalid
  const seen = new Set<string>();
  for (const t of tickets) {
    if (seen.has(t.id)) {
      throw new CapabilityInputError(`duplicate ticket id: ${t.id}`);
    }
    seen.add(t.id);
  }

  let minClusterSize = 2;
  if (input.minClusterSize !== undefined) {
    if (
      typeof input.minClusterSize !== "number" ||
      !Number.isInteger(input.minClusterSize) ||
      input.minClusterSize < 1
    ) {
      throw new CapabilityInputError("minClusterSize must be a positive integer");
    }
    minClusterSize = input.minClusterSize;
  }

  return { tickets, minClusterSize };
}
