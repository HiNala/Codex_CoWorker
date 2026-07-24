import type {
  CapabilityDescriptor,
  CapabilityRef,
  CapabilitySpec,
} from "@forge/contracts";

export interface StoredCapabilityVersion {
  ref: CapabilityRef;
  spec: CapabilitySpec;
  sha256: string;
  files: Record<string, string>;
  disabled: boolean;
}

export interface CapabilitySummary {
  slug: string;
  capabilityId: string;
  currentVersionId: string | null;
  version: string | null;
}

export interface CapabilityRegistry {
  resolve(orgId: string, descriptor: CapabilityDescriptor): Promise<CapabilityRef | null>;
  get(versionId: string): Promise<StoredCapabilityVersion | null>;
  list(orgId: string): Promise<CapabilitySummary[]>;
  install(input: {
    orgId: string;
    spec: CapabilitySpec;
    sha256: string;
    files: Record<string, string>;
  }): Promise<CapabilityRef>;
}

export class MemoryCapabilityRegistry implements CapabilityRegistry {
  readonly #byOrg = new Map<string, Map<string, StoredCapabilityVersion[]>>();
  readonly #byVersion = new Map<string, StoredCapabilityVersion>();

  async resolve(orgId: string, descriptor: CapabilityDescriptor): Promise<CapabilityRef | null> {
    const versions = this.#byOrg.get(orgId)?.get(descriptor.slug) ?? [];
    const current = [...versions].reverse().find((entry) => !entry.disabled);
    return current?.ref ?? null;
  }

  async get(versionId: string): Promise<StoredCapabilityVersion | null> {
    return this.#byVersion.get(versionId) ?? null;
  }

  async list(orgId: string): Promise<CapabilitySummary[]> {
    const org = this.#byOrg.get(orgId);
    if (!org) return [];
    return [...org.entries()].map(([slug, versions]) => {
      const current = [...versions].reverse().find((entry) => !entry.disabled);
      return {
        slug,
        capabilityId: current?.ref.capabilityId ?? versions[0]!.ref.capabilityId,
        currentVersionId: current?.ref.versionId ?? null,
        version: current?.ref.version ?? null,
      };
    });
  }

  async install(input: {
    orgId: string;
    spec: CapabilitySpec;
    sha256: string;
    files: Record<string, string>;
  }): Promise<CapabilityRef> {
    const orgMap = this.#byOrg.get(input.orgId) ?? new Map();
    const existing = orgMap.get(input.spec.slug) ?? [];
    const capabilityId = existing[0]?.ref.capabilityId ?? crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const version = "1.0.0";
    const ref: CapabilityRef = {
      capabilityId,
      versionId,
      slug: input.spec.slug,
      version,
    };
    const stored: StoredCapabilityVersion = {
      ref,
      spec: input.spec,
      sha256: input.sha256,
      files: input.files,
      disabled: false,
    };
    existing.push(stored);
    orgMap.set(input.spec.slug, existing);
    this.#byOrg.set(input.orgId, orgMap);
    this.#byVersion.set(versionId, stored);
    return ref;
  }

  async disable(versionId: string): Promise<void> {
    const entry = this.#byVersion.get(versionId);
    if (entry) entry.disabled = true;
  }
}
