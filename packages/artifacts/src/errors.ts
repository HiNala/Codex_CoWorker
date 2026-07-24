export class ArtifactStaleBaseError extends Error {
  readonly code = "artifact.stale_base_version" as const;
  readonly status = 409 as const;

  constructor(message = "Artifact base version is stale") {
    super(message);
    this.name = "ArtifactStaleBaseError";
  }
}

export class ArtifactNotFoundError extends Error {
  readonly code = "artifact.not_found" as const;
  readonly status = 404 as const;

  constructor(message = "Artifact not found") {
    super(message);
    this.name = "ArtifactNotFoundError";
  }
}

export class ArtifactIllegalTransitionError extends Error {
  readonly code = "artifact.illegal_transition" as const;
  readonly status = 409 as const;

  constructor(message: string) {
    super(message);
    this.name = "ArtifactIllegalTransitionError";
  }
}

export class ArtifactSecretDetectedError extends Error {
  readonly code = "artifact.secret_detected" as const;
  readonly status = 400 as const;

  constructor(message = "Artifact content failed secret scan") {
    super(message);
    this.name = "ArtifactSecretDetectedError";
  }
}

export class ArtifactValidationError extends Error {
  readonly code = "artifact.validation_failed" as const;
  readonly status = 400 as const;

  constructor(message: string) {
    super(message);
    this.name = "ArtifactValidationError";
  }
}

export class ArtifactNoContentError extends Error {
  readonly code = "artifact.no_content" as const;
  readonly status = 400 as const;

  constructor(message = "Artifact has no content version") {
    super(message);
    this.name = "ArtifactNoContentError";
  }
}
