import type {
  ActionGateway,
  ActionResult,
  ConnectionStatus,
  ExternalActionProposal,
  Ticket,
  TicketGateway,
} from "@forge/contracts";
import { demoTickets } from "@forge/demo-data";

export class FakeTicketGateway implements TicketGateway {
  readonly #privateNotes: Array<{ id: string; body: string; idempotencyKey: string }> = [];

  async listRecent(request: { since?: string; limit?: number }): Promise<Ticket[]> {
    return [...demoTickets].slice(0, request.limit ?? demoTickets.length);
  }

  async get(id: string): Promise<Ticket> {
    const ticket = demoTickets.find((candidate) => candidate.id === id);
    if (!ticket) throw new Error(`Ticket not found: ${id}`);
    return ticket;
  }

  async addPrivateNote(id: string, body: string, idempotencyKey: string): Promise<void> {
    if (!this.#privateNotes.some((note) => note.idempotencyKey === idempotencyKey)) {
      this.#privateNotes.push({ id, body, idempotencyKey });
    }
  }

  async draftPublicReply(id: string, _body: string): Promise<{ draftId: string }> {
    void _body;
    return { draftId: `draft-${id}` };
  }
}

export class FakeActionGateway implements ActionGateway {
  readonly executed: Array<{ proposal: ExternalActionProposal; approvalId: string }> = [];

  async available(_orgId: string): Promise<ConnectionStatus[]> {
    void _orgId;
    return [
      { provider: "github", state: "connected" },
      { provider: "slack", state: "connected" },
      { provider: "email", state: "connected" },
    ];
  }

  async execute(proposal: ExternalActionProposal, approvalId: string): Promise<ActionResult> {
    this.executed.push({ proposal, approvalId });
    return {
      provider: proposal.provider,
      action: proposal.action,
      externalId: `fake-${proposal.idempotencyKey}`,
      permalink: `https://example.test/actions/${proposal.idempotencyKey}`,
    };
  }
}
