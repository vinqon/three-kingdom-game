import { attack, beginFactionTurn, endFactionTurn, transfer } from '../game/actions.ts';
import { FACTION_ORDER, createLiteScenario, type ScenarioCityCount } from '../game/scenario.ts';
import type { FactionId, GameState } from '../game/types.ts';
import type { Policy } from './policies.ts';

export interface SelfPlayConfig {
  policies: Record<FactionId, Policy>;
  firstFaction: FactionId;
  candidateFaction: FactionId;
  cityCount: ScenarioCityCount;
  maxRounds: number;
  seed: number;
  troopMultipliers?: Partial<Record<FactionId, number>>;
}

export interface SelfPlayResult {
  winner?: FactionId;
  candidateWon: boolean;
  rounds: number;
  terminationReason: 'winner' | 'maxRounds' | 'stalled';
  metrics: {
    totalActions: number;
    attacks: number;
    transfers: number;
    noActionTurns: number;
    ownershipChanges: number;
    candidateCaptures: number;
    candidateLostCities: number;
    finalCityCount: Record<FactionId, number>;
    finalTroops: Record<FactionId, number>;
    capitalsControlled: Record<FactionId, number>;
  };
  initialTroopsByFaction: Record<FactionId, number>;
  initialState: GameState;
  finalState: GameState;
}

function emptyFactionTotals(): Record<FactionId, number> {
  return Object.fromEntries(FACTION_ORDER.map((faction) => [faction, 0])) as Record<FactionId, number>;
}

function troopTotals(state: GameState): Record<FactionId, number> {
  const totals = emptyFactionTotals();
  for (const city of Object.values(state.cities)) totals[city.owner] += city.troops;
  return totals;
}

export function applyTroopMultiplier(
  state: GameState,
  faction: FactionId,
  multiplier: number,
): GameState {
  const next = structuredClone(state);
  const cities = Object.values(next.cities)
    .filter((city) => city.owner === faction)
    .sort((left, right) =>
      Number(Boolean(right.capitalOf)) - Number(Boolean(left.capitalOf)) ||
      left.id.localeCompare(right.id),
    );
  const originalTotal = cities.reduce((sum, city) => sum + city.troops, 0);
  const targetTotal = Math.max(cities.length, Math.round(originalTotal * multiplier));
  const scaled = cities.map((city) => {
    const raw = city.troops * multiplier;
    return {
      city,
      troops: Math.max(1, Math.floor(raw)),
      fraction: raw - Math.floor(raw),
    };
  });
  let currentTotal = scaled.reduce((sum, item) => sum + item.troops, 0);

  for (const item of [...scaled].sort((left, right) =>
    right.fraction - left.fraction ||
    Number(Boolean(right.city.capitalOf)) - Number(Boolean(left.city.capitalOf)) ||
    left.city.id.localeCompare(right.city.id),
  )) {
    if (currentTotal >= targetTotal) break;
    item.troops += 1;
    currentTotal += 1;
  }

  for (const item of [...scaled].sort((left, right) =>
    left.fraction - right.fraction ||
    Number(Boolean(left.city.capitalOf)) - Number(Boolean(right.city.capitalOf)) ||
    right.city.id.localeCompare(left.city.id),
  )) {
    if (currentTotal <= targetTotal) break;
    if (item.troops <= 1) continue;
    item.troops -= 1;
    currentTotal -= 1;
  }

  for (const item of scaled) next.cities[item.city.id].troops = item.troops;
  return next;
}

function summarize(state: GameState): SelfPlayResult['metrics'] {
  const finalCityCount = emptyFactionTotals();
  const finalTroops = emptyFactionTotals();
  const capitalsControlled = emptyFactionTotals();
  for (const city of Object.values(state.cities)) {
    finalCityCount[city.owner] += 1;
    finalTroops[city.owner] += city.troops;
    if (city.capitalOf && city.owner !== city.capitalOf) capitalsControlled[city.owner] += 1;
  }
  return {
    totalActions: 0,
    attacks: 0,
    transfers: 0,
    noActionTurns: 0,
    ownershipChanges: 0,
    candidateCaptures: 0,
    candidateLostCities: 0,
    finalCityCount,
    finalTroops,
    capitalsControlled,
  };
}

function createInitialState(config: SelfPlayConfig): GameState {
  let state = createLiteScenario(config.firstFaction, config.cityCount, 'easy');
  state.turnFaction = config.firstFaction;
  for (const faction of FACTION_ORDER) {
    const multiplier = config.troopMultipliers?.[faction];
    if (multiplier !== undefined) state = applyTroopMultiplier(state, faction, multiplier);
  }
  return state;
}

export function runSelfPlay(config: SelfPlayConfig): SelfPlayResult {
  let state = createInitialState(config);
  const initialState = structuredClone(state);
  const initialTroopsByFaction = troopTotals(state);
  const metrics = summarize(state);
  let stalledTurns = 0;
  let startedCurrentTurn = false;

  while (state.status === 'playing' && state.round <= config.maxRounds) {
    if (!startedCurrentTurn && state.actionsRemaining === 0) {
      state = beginFactionTurn(state);
      startedCurrentTurn = true;
    }

    let acted = false;
    while (state.status === 'playing' && state.actionsRemaining > 0) {
      const policy = config.policies[state.turnFaction];
      const decision = policy.chooseAction(state);
      if (!decision) break;
      const targetOwnerBefore = state.cities[decision.targetCityId].owner;
      const result = decision.mode === 'attack'
        ? attack(state, decision)
        : transfer(state, decision);
      state = result.state;
      const targetOwnerAfter = state.cities[decision.targetCityId].owner;
      acted = true;
      metrics.totalActions += 1;
      if (decision.mode === 'attack') metrics.attacks += 1;
      if (decision.mode === 'transfer') metrics.transfers += 1;
      if (targetOwnerAfter !== targetOwnerBefore) {
        metrics.ownershipChanges += 1;
        if (targetOwnerAfter === config.candidateFaction) metrics.candidateCaptures += 1;
        if (targetOwnerBefore === config.candidateFaction) metrics.candidateLostCities += 1;
      }
    }

    if (!acted) metrics.noActionTurns += 1;
    stalledTurns = acted ? 0 : stalledTurns + 1;
    if (state.status !== 'playing' || stalledTurns >= FACTION_ORDER.length) break;
    state.actionsRemaining = 0;
    state = endFactionTurn(state);
    startedCurrentTurn = true;
  }

  const finalMetrics = summarize(state);
  finalMetrics.totalActions = metrics.totalActions;
  finalMetrics.attacks = metrics.attacks;
  finalMetrics.transfers = metrics.transfers;
  finalMetrics.noActionTurns = metrics.noActionTurns;
  finalMetrics.ownershipChanges = metrics.ownershipChanges;
  finalMetrics.candidateCaptures = metrics.candidateCaptures;
  finalMetrics.candidateLostCities = metrics.candidateLostCities;

  return {
    winner: state.winner,
    candidateWon: state.winner === config.candidateFaction,
    rounds: Math.min(state.round, config.maxRounds),
    terminationReason: state.winner ? 'winner' : stalledTurns >= FACTION_ORDER.length ? 'stalled' : 'maxRounds',
    metrics: finalMetrics,
    initialTroopsByFaction,
    initialState,
    finalState: state,
  };
}
