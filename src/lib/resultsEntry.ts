/** Host results entry state — tap-to-order finishers; DNF/DNS sit outside the order. */

import type {ResultsRankingMode} from './eventResults';

export type ResultsEntryDriver = {
  discordId: string;
  label: string;
  avatarUrl?: string;
  groupIndex: number;
  username?: string;
  gamertag?: string | null;
  /** Host-added from guild search / waitlist — can be removed before submit. */
  addedFromGuild?: boolean;
};

export type DriverOutcome = 'pending' | 'dnf' | 'dns';

export type ResultsEntryState = {
  mode: ResultsRankingMode;
  drivers: ResultsEntryDriver[];
  /** Finish order for overall ranking (global positions). */
  overallOrder: string[];
  /** Finish order per convoy when mode is per_group. */
  groupOrders: Record<number, string[]>;
  outcome: Record<string, DriverOutcome>;
};

export function initResultsEntry(
  drivers: ResultsEntryDriver[],
  mode: ResultsRankingMode = 'per_group',
): ResultsEntryState {
  const outcome: Record<string, DriverOutcome> = {};
  for (const d of drivers) outcome[d.discordId] = 'pending';
  const groupOrders: Record<number, string[]> = {};
  for (const d of drivers) {
    if (!groupOrders[d.groupIndex]) groupOrders[d.groupIndex] = [];
  }
  return {mode, drivers, overallOrder: [], groupOrders, outcome};
}

export function resultsEntryGroupIndexes(state: ResultsEntryState): number[] {
  return [...new Set(state.drivers.map((d) => d.groupIndex))].sort(
    (a, b) => a - b,
  );
}

export function addResultsDriver(
  state: ResultsEntryState,
  driver: ResultsEntryDriver,
): ResultsEntryState {
  if (state.drivers.some((d) => d.discordId === driver.discordId)) return state;
  const next = {...driver, addedFromGuild: driver.addedFromGuild ?? true};
  return {
    ...state,
    drivers: [...state.drivers, next],
    outcome: {...state.outcome, [next.discordId]: 'pending'},
    groupOrders: state.groupOrders[next.groupIndex]
      ? state.groupOrders
      : {...state.groupOrders, [next.groupIndex]: []},
  };
}

export function removeResultsDriver(
  state: ResultsEntryState,
  discordId: string,
): ResultsEntryState {
  const driver = state.drivers.find((d) => d.discordId === discordId);
  if (!driver?.addedFromGuild) return state;
  const cleared = removeFromAllOrders(state, discordId);
  const outcome = {...cleared.outcome};
  delete outcome[discordId];
  return {
    ...cleared,
    drivers: cleared.drivers.filter((d) => d.discordId !== discordId),
    outcome,
  };
}

function withOrder(
  state: ResultsEntryState,
  groupIndex: number,
  order: string[],
): ResultsEntryState {
  if (state.mode === 'overall') return {...state, overallOrder: order};
  return {
    ...state,
    groupOrders: {...state.groupOrders, [groupIndex]: order},
  };
}

function removeFromAllOrders(
  state: ResultsEntryState,
  discordId: string,
): ResultsEntryState {
  const overallOrder = state.overallOrder.filter((id) => id !== discordId);
  const groupOrders: Record<number, string[]> = {};
  for (const [g, ids] of Object.entries(state.groupOrders)) {
    groupOrders[Number(g)] = ids.filter((id) => id !== discordId);
  }
  return {...state, overallOrder, groupOrders};
}

export function setResultsRankingMode(
  state: ResultsEntryState,
  mode: ResultsRankingMode,
): ResultsEntryState {
  if (state.mode === mode) return state;
  return initResultsEntry(state.drivers, mode);
}

/** Append a pending driver to the finish order for their scope. */
export function placeDriver(
  state: ResultsEntryState,
  discordId: string,
): ResultsEntryState {
  const driver = state.drivers.find((d) => d.discordId === discordId);
  if (!driver) return state;
  if (state.outcome[discordId] === 'dnf' || state.outcome[discordId] === 'dns')
    return state;

  const cleared = removeFromAllOrders(state, discordId);
  const order =
    cleared.mode === 'overall'
      ? [...cleared.overallOrder]
      : [...(cleared.groupOrders[driver.groupIndex] ?? [])];
  if (order.includes(discordId)) return cleared;
  order.push(discordId);
  return {
    ...withOrder(cleared, driver.groupIndex, order),
    outcome: {...cleared.outcome, [discordId]: 'pending'},
  };
}

export function unplaceDriver(
  state: ResultsEntryState,
  discordId: string,
): ResultsEntryState {
  return {
    ...removeFromAllOrders(state, discordId),
    outcome: {...state.outcome, [discordId]: 'pending'},
  };
}

export function setDriverOutcome(
  state: ResultsEntryState,
  discordId: string,
  outcome: DriverOutcome,
): ResultsEntryState {
  if (!state.drivers.some((d) => d.discordId === discordId)) return state;
  const next = removeFromAllOrders(state, discordId);
  return {...next, outcome: {...next.outcome, [discordId]: outcome}};
}

export function moveOrderedDriver(
  state: ResultsEntryState,
  discordId: string,
  dir: -1 | 1,
): ResultsEntryState {
  const driver = state.drivers.find((d) => d.discordId === discordId);
  if (!driver) return state;
  const order =
    state.mode === 'overall'
      ? [...state.overallOrder]
      : [...(state.groupOrders[driver.groupIndex] ?? [])];
  const index = order.indexOf(discordId);
  if (index < 0) return state;
  const next = index + dir;
  if (next < 0 || next >= order.length) return state;
  [order[index], order[next]] = [order[next]!, order[index]!];
  return withOrder(state, driver.groupIndex, order);
}

export function orderedDriversInScope(
  state: ResultsEntryState,
  groupIndex?: number,
): ResultsEntryDriver[] {
  const ids =
    state.mode === 'overall'
      ? state.overallOrder
      : (state.groupOrders[groupIndex ?? 1] ?? []);
  const byId = new Map(state.drivers.map((d) => [d.discordId, d]));
  return ids
    .map((id) => byId.get(id))
    .filter((d): d is ResultsEntryDriver => Boolean(d));
}

export function poolDriversInScope(
  state: ResultsEntryState,
  groupIndex?: number,
): ResultsEntryDriver[] {
  const ordered = new Set(
    state.mode === 'overall'
      ? state.overallOrder
      : (state.groupOrders[groupIndex ?? 1] ?? []),
  );
  return state.drivers.filter((d) => {
    if (
      state.mode === 'per_group' &&
      groupIndex != null &&
      d.groupIndex !== groupIndex
    ) {
      return false;
    }
    if (ordered.has(d.discordId)) return false;
    return true;
  });
}

export function isResultsEntryComplete(state: ResultsEntryState): boolean {
  if (state.drivers.length === 0) return false;
  for (const d of state.drivers) {
    const outcome = state.outcome[d.discordId] ?? 'pending';
    if (outcome === 'dnf' || outcome === 'dns') continue;
    const inOrder =
      state.mode === 'overall'
        ? state.overallOrder.includes(d.discordId)
        : (state.groupOrders[d.groupIndex] ?? []).includes(d.discordId);
    if (!inOrder) return false;
  }
  return true;
}

export type ResultsPlacementForSubmit = {
  discordId: string;
  groupIndex: number;
  dnf: boolean;
  dns: boolean;
};

/** Flatten entry state into placement order for `buildResultSubmitRows`. */
export function placementsForSubmit(
  state: ResultsEntryState,
): ResultsPlacementForSubmit[] {
  const byId = new Map(state.drivers.map((d) => [d.discordId, d]));
  const out: ResultsPlacementForSubmit[] = [];

  if (state.mode === 'overall') {
    for (const id of state.overallOrder) {
      const d = byId.get(id);
      if (!d) continue;
      out.push({
        discordId: id,
        groupIndex: d.groupIndex,
        dnf: false,
        dns: false,
      });
    }
  } else {
    for (const g of resultsEntryGroupIndexes(state)) {
      for (const id of state.groupOrders[g] ?? []) {
        const d = byId.get(id);
        if (!d) continue;
        out.push({
          discordId: id,
          groupIndex: d.groupIndex,
          dnf: false,
          dns: false,
        });
      }
    }
  }

  for (const d of state.drivers) {
    const outcome = state.outcome[d.discordId] ?? 'pending';
    if (outcome === 'dnf') {
      out.push({
        discordId: d.discordId,
        groupIndex: d.groupIndex,
        dnf: true,
        dns: false,
      });
    } else if (outcome === 'dns') {
      out.push({
        discordId: d.discordId,
        groupIndex: d.groupIndex,
        dnf: false,
        dns: true,
      });
    }
  }
  return out;
}
