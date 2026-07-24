const baseUrl = (process.argv[2] ?? "http://127.0.0.1:3002").replace(/\/$/, "");

const response = await fetch(`${baseUrl}/v1/build`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    spec: {
      slug: "ignition-probe",
      name: "Ignition probe",
      purpose: "Verify the Foundry build service contract.",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      permissions: {
        network: false,
        filesystem: "none",
        evidenceRead: true,
        maxDurationMs: 10_000,
        maxMemoryMb: 256,
        maxOutputBytes: 500_000,
      },
      trustedTestCases: [{ name: "identity", input: { value: 1 }, expected: { value: 1 } }],
    },
  }),
  signal: AbortSignal.timeout(45_000),
});

const body = (await response.json()) as {
  status?: string;
  events?: { type?: string }[];
  result?: { sessionId?: string; files?: Record<string, string> };
  detail?: string;
};
if (!response.ok) {
  throw new Error(`Foundry returned ${response.status}: ${body.detail ?? JSON.stringify(body)}`);
}
if (
  body.status !== "built" ||
  body.events?.at(-1)?.type !== "completed" ||
  !body.result?.files?.["src/index.ts"] ||
  !body.result.files["capability.json"]
) {
  throw new Error(`Foundry response did not satisfy the build contract: ${JSON.stringify(body)}`);
}

console.log(
  JSON.stringify({
    status: "ok",
    operation: "foundry-build",
    sessionId: body.result.sessionId,
    eventCount: body.events.length,
    files: Object.keys(body.result.files).sort(),
  }),
);
