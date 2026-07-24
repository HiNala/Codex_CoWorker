export interface ExecSpec {
  image: string;
  command: string[];
  files: Record<string, string>;
  env: Record<string, string>;
  timeoutMs: number;
  memoryMb: number;
  cpus: number;
  network: "none" | "isolated";
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
  files: Record<string, string>;
}

export interface ExecutionBackend {
  readonly name: "docker" | "railway-sandbox" | "fake";
  run(spec: ExecSpec, onOutput?: (chunk: string) => void): Promise<ExecResult>;
  healthy(): Promise<boolean>;
}
