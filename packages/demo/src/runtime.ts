/**
 * Mutable in-process demo runtime.
 *
 * Adapter panic flips live here so the control panel and API can agree without
 * restarting the Node process. Full process-env flips (ADAPTER_*) still require
 * a restart for consumers that only call `getFlags()` once at boot.
 */

import type { AdapterMap } from "./panic";
import { allFakeAdapters } from "./panic";

export type DemoSeedState = {
  seeded: boolean;
  capabilities: number;
  activeRuns: number;
  lastResetAt: string | null;
  lastSeedAt: string | null;
  lastResetDurationMs: number | null;
  assignmentId: string | null;
  coworkerId: string | null;
  orgId: string | null;
};

export type ReplayState = {
  active: boolean;
  transcriptId: string | null;
  startedAt: string | null;
  eventCount: number;
  error: string | null;
};

export type DemoRuntimeSnapshot = {
  adapters: AdapterMap;
  panicActive: boolean;
  panicAt: string | null;
  seed: DemoSeedState;
  replay: ReplayState;
  presenterMode: boolean;
  note: string;
};

const defaultSeed = (): DemoSeedState => ({
  seeded: false,
  capabilities: 4,
  activeRuns: 0,
  lastResetAt: null,
  lastSeedAt: null,
  lastResetDurationMs: null,
  assignmentId: null,
  coworkerId: null,
  orgId: null,
});

const defaultReplay = (): ReplayState => ({
  active: false,
  transcriptId: null,
  startedAt: null,
  eventCount: 0,
  error: null,
});

function createInitial(): DemoRuntimeSnapshot {
  return {
    adapters: allFakeAdapters(),
    panicActive: false,
    panicAt: null,
    seed: defaultSeed(),
    replay: defaultReplay(),
    presenterMode: false,
    note: "In-memory demo runtime. Process env adapter flags may still require restart for some workers.",
  };
}

let state: DemoRuntimeSnapshot = createInitial();

export function getDemoRuntime(): DemoRuntimeSnapshot {
  return {
    ...state,
    adapters: { ...state.adapters },
    seed: { ...state.seed },
    replay: { ...state.replay },
  };
}

export function setDemoAdapters(adapters: AdapterMap): AdapterMap {
  state = {
    ...state,
    adapters: { ...adapters },
  };
  return { ...state.adapters };
}

export function markPanic(at: string = new Date().toISOString()): void {
  state = {
    ...state,
    panicActive: true,
    panicAt: at,
  };
}

export function clearPanic(): void {
  state = {
    ...state,
    panicActive: false,
    panicAt: null,
  };
}

export function updateSeedState(partial: Partial<DemoSeedState>): DemoSeedState {
  state = {
    ...state,
    seed: { ...state.seed, ...partial },
  };
  return { ...state.seed };
}

export function updateReplayState(partial: Partial<ReplayState>): ReplayState {
  state = {
    ...state,
    replay: { ...state.replay, ...partial },
  };
  return { ...state.replay };
}

export function setPresenterMode(enabled: boolean): boolean {
  state = { ...state, presenterMode: enabled };
  return state.presenterMode;
}

/** Test helper — resets in-memory state. */
export function resetDemoRuntimeForTests(): void {
  state = createInitial();
}
