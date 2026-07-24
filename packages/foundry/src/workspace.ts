import type { CapabilitySpec } from "@forge/contracts";

export const BUILD_AGENTS_MD = `# Build rules

- Export a default object satisfying \`Capability<Input, Output>\` from src/index.ts.
- ZERO third-party dependencies. Node standard library is not available either —
  no fs, no net, no child_process, no process, no fetch.
- \`execute(input, context)\` must be a pure function of its arguments. Same input, same output.
- Use only \`context.evidence\`, \`context.log\`, \`context.signal\`, \`context.now()\`.
- Validate input against the input schema; throw \`CapabilityInputError\` on mismatch.
- Write tests in tests/. Fixtures in /job/fixtures are READ-ONLY and must pass unmodified.
- If a fixture seems wrong, say so in your result. DO NOT EDIT IT. Editing a fixture fails the build.
- Keep src/index.ts under 300 lines. Split into src/lib/*.ts if needed.
`;

/**
 * Assemble the sandbox workspace layout Codex (or the fake) sees.
 * Fixtures are written once; callers should hash them before the build.
 */
export function assembleWorkspace(spec: CapabilitySpec): Record<string, string> {
  const fixtures: Record<string, string> = {};
  for (const test of spec.trustedTestCases) {
    fixtures[`fixtures/${test.name}.json`] = JSON.stringify(
      { name: test.name, input: test.input, expected: test.expected },
      null,
      2,
    );
  }

  return {
    "spec/capability-spec.json": JSON.stringify(spec, null, 2),
    "spec/AGENTS.md": BUILD_AGENTS_MD,
    "spec/prompt.txt": `Build capability ${spec.slug}: ${spec.purpose}`,
    "schemas/input.schema.json": JSON.stringify(spec.inputSchema, null, 2),
    "schemas/output.schema.json": JSON.stringify(spec.outputSchema, null, 2),
    "schemas/result.schema.json": JSON.stringify(
      {
        type: "object",
        required: ["summary", "files"],
        properties: {
          summary: { type: "string" },
          files: { type: "object" },
        },
      },
      null,
      2,
    ),
    "workspace/package.json": JSON.stringify(
      { name: spec.slug, private: true, type: "module", version: "1.0.0" },
      null,
      2,
    ),
    "workspace/src/index.ts":
      "// Codex writes the capability implementation here.\nexport async function execute(input: unknown) { return input; }\n",
    ...fixtures,
  };
}
