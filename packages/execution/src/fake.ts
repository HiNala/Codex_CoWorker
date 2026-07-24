import type { ExecResult, ExecSpec, ExecutionBackend } from "@forge/contracts";

export class FakeExecutionBackend implements ExecutionBackend {
  readonly name = "fake" as const;

  constructor(private readonly delayMs = 5) {}

  async run(spec: ExecSpec, onOutput?: (chunk: string) => void): Promise<ExecResult> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    const stdout = `fake sandbox: ${spec.command.join(" ")}`;
    onOutput?.(stdout);
    return {
      exitCode: 0,
      stdout,
      stderr: "",
      timedOut: false,
      durationMs: this.delayMs,
      files: { ...spec.files },
    };
  }

  async healthy(): Promise<boolean> {
    return true;
  }
}
