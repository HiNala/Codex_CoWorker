import type { Ticket, TicketGateway } from "@forge/contracts";
import { demoTickets } from "@forge/demo-data";

export interface ZendeskCredentials {
  subdomain: string;
  email: string;
  apiToken: string;
}

export function isZendeskConfigured(env: {
  ZENDESK_SUBDOMAIN?: string | undefined;
  ZENDESK_EMAIL?: string | undefined;
  ZENDESK_API_TOKEN?: string | undefined;
}): env is {
  ZENDESK_SUBDOMAIN: string;
  ZENDESK_EMAIL: string;
  ZENDESK_API_TOKEN: string;
} {
  return Boolean(
    env.ZENDESK_SUBDOMAIN?.trim() && env.ZENDESK_EMAIL?.trim() && env.ZENDESK_API_TOKEN?.trim(),
  );
}

/**
 * Import path used by the demo when live Zendesk is not_configured.
 * Same TicketGateway surface as the live adapter — no credentials required.
 */
export class ImportTicketGateway implements TicketGateway {
  readonly #tickets: Ticket[];
  readonly #privateNotes = new Map<string, { body: string; idempotencyKey: string }>();
  readonly #drafts = new Map<string, string>();

  constructor(tickets: readonly Ticket[] = demoTickets) {
    this.#tickets = [...tickets];
  }

  async listRecent(request: { since?: string; limit?: number }): Promise<Ticket[]> {
    let list = [...this.#tickets];
    if (request.since) {
      const sinceMs = Date.parse(request.since);
      list = list.filter((t) => Date.parse(t.createdAt) >= sinceMs);
    }
    return list.slice(0, request.limit ?? list.length);
  }

  async get(id: string): Promise<Ticket> {
    const ticket = this.#tickets.find((t) => t.id === id);
    if (!ticket) throw new Error(`Ticket not found: ${id}`);
    return ticket;
  }

  async addPrivateNote(id: string, body: string, idempotencyKey: string): Promise<void> {
    await this.get(id);
    if (this.#privateNotes.has(idempotencyKey)) return;
    this.#privateNotes.set(idempotencyKey, { body, idempotencyKey });
  }

  async draftPublicReply(id: string, body: string): Promise<{ draftId: string }> {
    await this.get(id);
    const draftId = `draft-${id}-${this.#drafts.size + 1}`;
    this.#drafts.set(draftId, body);
    return { draftId };
  }

  /** Test helper — never log body contents in production paths. */
  noteCount(): number {
    return this.#privateNotes.size;
  }
}

/**
 * Live Zendesk REST adapter. Private note is the only write that runs without
 * an ExternalActionProposal. Public replies must stay drafts until approval.
 */
export class ZendeskTicketGateway implements TicketGateway {
  readonly #baseUrl: string;
  readonly #authHeader: string;
  readonly #fetchFn: typeof fetch;
  readonly #appliedNotes = new Set<string>();

  constructor(
    credentials: ZendeskCredentials,
    fetchFn: typeof fetch = fetch,
  ) {
    this.#baseUrl = `https://${credentials.subdomain}.zendesk.com/api/v2`;
    const token = Buffer.from(`${credentials.email}/token:${credentials.apiToken}`).toString(
      "base64",
    );
    this.#authHeader = `Basic ${token}`;
    this.#fetchFn = fetchFn;
  }

  async listRecent(request: { since?: string; limit?: number }): Promise<Ticket[]> {
    const limit = request.limit ?? 25;
    const url = new URL(`${this.#baseUrl}/tickets.json`);
    url.searchParams.set("sort_by", "created_at");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("per_page", String(Math.min(limit, 100)));
    const res = await this.#request(url);
    const data = (await res.json()) as { tickets?: ZendeskTicketJson[] };
    let tickets = (data.tickets ?? []).map(mapTicket);
    if (request.since) {
      const sinceMs = Date.parse(request.since);
      tickets = tickets.filter((t) => Date.parse(t.createdAt) >= sinceMs);
    }
    return tickets.slice(0, limit);
  }

  async get(id: string): Promise<Ticket> {
    const res = await this.#request(`${this.#baseUrl}/tickets/${encodeURIComponent(id)}.json`);
    const data = (await res.json()) as { ticket: ZendeskTicketJson };
    return mapTicket(data.ticket);
  }

  async addPrivateNote(id: string, body: string, idempotencyKey: string): Promise<void> {
    if (this.#appliedNotes.has(idempotencyKey)) return;
    const res = await this.#request(`${this.#baseUrl}/tickets/${encodeURIComponent(id)}.json`, {
      method: "PUT",
      body: JSON.stringify({
        ticket: {
          comment: { body, public: false },
        },
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
    });
    if (!res.ok) {
      throw new Error(`Zendesk private note failed: ${res.status}`);
    }
    this.#appliedNotes.add(idempotencyKey);
  }

  /**
   * NEVER sends a public comment. Stores a draft artifact reference only.
   * Customer-facing replies go through ExternalActionProposal + approval.
   */
  async draftPublicReply(id: string, body: string): Promise<{ draftId: string }> {
    await this.get(id);
    // Drafts are local until an approved external action executes.
    return { draftId: `zd-draft-${id}-${hashShort(body)}` };
  }

  async #request(url: string | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", this.#authHeader);
    headers.set("Accept", "application/json");
    const res = await this.#fetchFn(url, { ...init, headers });
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Zendesk auth failed: ${res.status}`);
    }
    if (!res.ok && init.method && init.method !== "GET") {
      return res;
    }
    if (!res.ok) {
      throw new Error(`Zendesk request failed: ${res.status}`);
    }
    return res;
  }
}

interface ZendeskTicketJson {
  id: number | string;
  subject?: string;
  description?: string;
  requester_id?: number | string;
  status?: string;
  created_at?: string;
}

function mapTicket(raw: ZendeskTicketJson): Ticket {
  const status = normalizeStatus(raw.status);
  return {
    id: String(raw.id),
    subject: raw.subject ?? "(no subject)",
    body: raw.description ?? "",
    requester: raw.requester_id != null ? String(raw.requester_id) : "unknown",
    status,
    createdAt: raw.created_at ?? new Date().toISOString(),
  };
}

function normalizeStatus(status: string | undefined): Ticket["status"] {
  switch (status) {
    case "new":
    case "open":
    case "pending":
    case "solved":
    case "closed":
      return status;
    default:
      return "open";
  }
}

function hashShort(body: string): string {
  let h = 0;
  for (let i = 0; i < body.length; i++) {
    h = (h * 31 + body.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Factory: live when credentials exist, otherwise import demo tickets. */
export function createTicketGateway(env: {
  ZENDESK_SUBDOMAIN?: string | undefined;
  ZENDESK_EMAIL?: string | undefined;
  ZENDESK_API_TOKEN?: string | undefined;
}): { gateway: TicketGateway; state: "connected" | "not_configured" } {
  if (isZendeskConfigured(env)) {
    return {
      gateway: new ZendeskTicketGateway({
        subdomain: env.ZENDESK_SUBDOMAIN,
        email: env.ZENDESK_EMAIL,
        apiToken: env.ZENDESK_API_TOKEN,
      }),
      state: "connected",
    };
  }
  return { gateway: new ImportTicketGateway(), state: "not_configured" };
}
