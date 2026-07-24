export const goldenPath = {
  title: "The broken annual checkout",
  request: "Find out why customers cannot buy the annual plan and prepare a verified fix.",
  capabilityGap: "checkout-error-log-analyzer",
  expectedArtifactTypes: [
    "document.markdown",
    "table.typed",
    "code.change",
    "capability.package",
    "receipt.assignment",
  ],
} as const;
