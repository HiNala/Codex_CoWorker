import type {
  CapabilitySpec,
  CodexAdapter,
  CodexBuildResult,
  CodexEvent,
  GateResult,
} from "@forge/contracts";

export class FakeCodex implements CodexAdapter {
  readonly #cancelled = new Set<string>();
  readonly #paceMs: number;

  constructor(paceMs = 6_000) {
    this.#paceMs = paceMs;
  }

  async build(
    request: {
      spec: CapabilitySpec;
      workspaceFiles: Record<string, string>;
      outputSchema: object;
      timeoutMs: number;
    },
    onEvent: (event: CodexEvent) => void,
  ): Promise<CodexBuildResult> {
    const sessionId = `fake-codex-${request.spec.slug}`;
    const stages = [
      "Sandbox initialized with zero credentials.",
      "Capability manifest written.",
      "Pure JSON transformer implemented.",
      "Generated tests added.",
      "Bundle prepared for independent verification.",
    ];
    onEvent({ type: "session.started", sessionId, summary: "Fake Codex session started." });

    for (const summary of stages) {
      await this.pause(sessionId);
      onEvent({ type: "output", sessionId, summary });
    }

    const result = {
      sessionId,
      files: {
        "src/index.ts": [
          "export async function execute(input: unknown): Promise<unknown> {",
          "  return input;",
          "}",
          "",
        ].join("\n"),
        "capability.json": JSON.stringify(
          {
            schemaVersion: 1,
            slug: request.spec.slug,
            name: request.spec.name,
            version: "1.0.0",
            runtime: "node22",
            dependencies: [],
            permissions: request.spec.permissions,
          },
          null,
          2,
        ),
      },
      summary: `Built ${request.spec.slug} for independent verification.`,
    };
    onEvent({ type: "completed", sessionId, summary: result.summary });
    return result;
  }

  async repair(
    request: { sessionId: string; failure: GateResult; timeoutMs: number },
    onEvent: (event: CodexEvent) => void,
  ): Promise<CodexBuildResult> {
    await this.pause(request.sessionId);
    onEvent({
      type: "output",
      sessionId: request.sessionId,
      summary: `Reproduced trusted gate failure: ${request.failure.gate}.`,
    });
    await this.pause(request.sessionId);
    onEvent({
      type: "completed",
      sessionId: request.sessionId,
      summary: "Applied a bounded repair without modifying trusted fixtures.",
    });
    return {
      sessionId: request.sessionId,
      files: {
        "src/index.ts": "export async function execute(input: unknown) { return input; }\n",
      },
      summary: "Repair prepared for re-verification.",
    };
  }

  async cancel(sessionId: string): Promise<void> {
    this.#cancelled.add(sessionId);
  }

  private async pause(sessionId: string): Promise<void> {
    if (this.#cancelled.has(sessionId)) {
      throw new Error(`Codex session cancelled: ${sessionId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, this.#paceMs));
  }
}
