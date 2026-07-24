import type {
  ActionGateway,
  AgentModel,
  CodexAdapter,
  ExecutionBackend,
  ObjectStore,
  ResearchGateway,
  TicketGateway,
} from "@forge/contracts";
import type { Flags } from "./flags";

export interface AdapterSet<T> {
  fake: T;
  live: T;
}

export interface ContainerInputs {
  model: AdapterSet<AgentModel>;
  codex: AdapterSet<CodexAdapter>;
  research: AdapterSet<ResearchGateway>;
  tickets: AdapterSet<TicketGateway>;
  actions: AdapterSet<ActionGateway>;
  objectStore: ObjectStore;
  sandbox: {
    docker: ExecutionBackend;
    railway: ExecutionBackend;
    fake: ExecutionBackend;
  };
}

export interface Container {
  model: AgentModel;
  codex: CodexAdapter;
  research: ResearchGateway;
  tickets: TicketGateway;
  actions: ActionGateway;
  objectStore: ObjectStore;
  sandbox: ExecutionBackend;
}

export function buildContainer(flags: Flags, adapters: ContainerInputs): Container {
  return {
    model: adapters.model[flags.adapters.openai],
    codex: adapters.codex[flags.adapters.codex],
    research: adapters.research[flags.adapters.octen],
    tickets: adapters.tickets[flags.adapters.zendesk],
    actions: adapters.actions[flags.adapters.composio],
    objectStore: adapters.objectStore,
    sandbox: adapters.sandbox[flags.adapters.sandbox],
  };
}
