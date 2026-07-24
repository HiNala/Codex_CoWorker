export interface TrustedFixture<Input = unknown, Output = unknown> {
  readonly name: string;
  readonly input: Input;
  readonly expected: Output;
}
