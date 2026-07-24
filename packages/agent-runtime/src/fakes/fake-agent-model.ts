import type {
  AgentModel,
  ModelInput,
  ModelTier,
  NormalisedModelEvent,
  ToolDescriptor,
  Usage,
} from "@forge/contracts";
import type { z } from "zod";

export class FakeAgentModel implements AgentModel {
  constructor(
    private readonly structuredValue: unknown,
    private readonly paceMs = 25,
  ) {}

  async structured<T>(request: {
    schema: z.ZodType<T>;
    system: string;
    input: ModelInput[];
    model?: ModelTier;
    maxOutputTokens?: number;
  }): Promise<{ value: T; usage: Usage; reasoningSummary?: string }> {
    await this.pause();
    return {
      value: request.schema.parse(this.structuredValue),
      usage: { inputTokens: 420, outputTokens: 180, cachedTokens: 0 },
      reasoningSummary: "Mapped the request to a bounded contract and explicit completion checks.",
    };
  }

  async *stream(_request: {
    system: string;
    input: ModelInput[];
    tools?: ToolDescriptor[];
    model?: ModelTier;
  }): AsyncIterable<NormalisedModelEvent> {
    void _request;
    const events: NormalisedModelEvent[] = [
      {
        type: "reasoning_summary",
        text: "Inspecting the accepted contract and available evidence.",
      },
      { type: "text_delta", text: "I found a capability gap in structured checkout-log analysis." },
      { type: "completed" },
    ];

    for (const event of events) {
      await this.pause();
      yield event;
    }
  }

  private async pause(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.paceMs));
  }
}
