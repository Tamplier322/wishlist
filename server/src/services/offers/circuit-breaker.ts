const FAILURE_THRESHOLD = 3;
const OPEN_MS = 60_000;

interface BreakerState {
  failures: number;
  openUntil: number;
}

const states = new Map<string, BreakerState>();

export function canRequest(name: string): boolean {
  const state = states.get(name);
  if (!state) return true;
  if (state.openUntil === 0) return true;
  return Date.now() >= state.openUntil;
}

export function recordSuccess(name: string): void {
  states.set(name, { failures: 0, openUntil: 0 });
}

export function recordFailure(name: string): void {
  const state = states.get(name) ?? { failures: 0, openUntil: 0 };
  const failures = state.failures + 1;
  if (failures >= FAILURE_THRESHOLD) {
    states.set(name, { failures: 0, openUntil: Date.now() + OPEN_MS });
    console.warn(`[offers] circuit breaker open for ${name} (${OPEN_MS / 1000}s)`);
    return;
  }
  states.set(name, { failures, openUntil: 0 });
}

export interface BreakerSnapshot {
  name: string;
  open: boolean;
  failures: number;
  openUntil: string | null;
}

export function breakerSnapshot(): BreakerSnapshot[] {
  return Array.from(states.entries()).map(([name, state]) => ({
    name,
    open: state.openUntil > Date.now(),
    failures: state.failures,
    openUntil: state.openUntil > 0 ? new Date(state.openUntil).toISOString() : null,
  }));
}

export function resetBreakers(): void {
  states.clear();
}
