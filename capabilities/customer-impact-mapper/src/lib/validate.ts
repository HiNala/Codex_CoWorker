import {
  CapabilityInputError,
  assertArray,
  assertInteger,
  assertObject,
} from "@forge/capability-sdk";
import type { Account, ClusterRef, ImpactMapperInput } from "./types";

function parseCluster(raw: unknown, index: number): ClusterRef {
  assertObject(raw, `clusters[${index}] must be an object`);
  if (typeof raw.clusterId !== "string" || raw.clusterId.length === 0) {
    throw new CapabilityInputError(`clusters[${index}].clusterId must be a non-empty string`);
  }
  assertArray(raw.ticketIds, `clusters[${index}].ticketIds must be an array`);
  const ticketIds: string[] = [];
  for (let i = 0; i < raw.ticketIds.length; i++) {
    const id = raw.ticketIds[i];
    if (typeof id !== "string" || id.length === 0) {
      throw new CapabilityInputError(
        `clusters[${index}].ticketIds[${i}] must be a non-empty string`,
      );
    }
    ticketIds.push(id);
  }
  return { clusterId: raw.clusterId, ticketIds };
}

function parseAccount(raw: unknown, index: number): Account {
  assertObject(raw, `accounts[${index}] must be an object`);
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new CapabilityInputError(`accounts[${index}].id must be a non-empty string`);
  }
  if (typeof raw.name !== "string") {
    throw new CapabilityInputError(`accounts[${index}].name must be a string`);
  }
  if (typeof raw.plan !== "string") {
    throw new CapabilityInputError(`accounts[${index}].plan must be a string`);
  }
  assertInteger(raw.mrrMicrodollars, `accounts[${index}].mrrMicrodollars`);
  assertArray(raw.contacts, `accounts[${index}].contacts must be an array`);
  const contacts = raw.contacts.map((c, ci) => {
    assertObject(c, `accounts[${index}].contacts[${ci}] must be an object`);
    if (typeof c.id !== "string" || c.id.length === 0) {
      throw new CapabilityInputError(
        `accounts[${index}].contacts[${ci}].id must be a non-empty string`,
      );
    }
    if (typeof c.email !== "string") {
      throw new CapabilityInputError(`accounts[${index}].contacts[${ci}].email must be a string`);
    }
    return { id: c.id, email: c.email };
  });
  return {
    id: raw.id,
    name: raw.name,
    plan: raw.plan,
    mrrMicrodollars: raw.mrrMicrodollars as number,
    contacts,
  };
}

export function validateInput(input: unknown): ImpactMapperInput {
  assertObject(input, "input must be an object");
  assertArray(input.clusters, "clusters must be an array");
  assertArray(input.accounts, "accounts must be an array");
  assertObject(input.ticketRequesterIndex, "ticketRequesterIndex must be an object");

  const ticketRequesterIndex: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.ticketRequesterIndex)) {
    if (typeof v !== "string") {
      throw new CapabilityInputError(`ticketRequesterIndex[${k}] must be a string`);
    }
    ticketRequesterIndex[k] = v;
  }

  return {
    clusters: input.clusters.map(parseCluster),
    accounts: input.accounts.map(parseAccount),
    ticketRequesterIndex,
  };
}
