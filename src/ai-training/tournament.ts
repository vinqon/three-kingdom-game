import { FACTION_ORDER, type ScenarioCityCount } from '../game/scenario.ts';
import type { FactionId } from '../game/types.ts';
import type { Policy } from './policies.ts';
import { runSelfPlay, type SelfPlayResult } from './self-play.ts';

export interface EvaluationSuiteConfig {
  candidate: Policy;
  opponents: Partial<Record<FactionId, Policy>>;
  games: number;
  cityCounts: readonly ScenarioCityCount[];
  maxRounds: number;
  candidateTroopMultiplier: number;
  seed: number;
}

export interface EvaluationSummary {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  results: SelfPlayResult[];
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

function leastCommonMultiple(left: number, right: number): number {
  return left / greatestCommonDivisor(left, right) * right;
}

export function runEvaluationSuite(config: EvaluationSuiteConfig): EvaluationSummary {
  const results: SelfPlayResult[] = [];
  const uniqueGames = Math.min(
    config.games,
    leastCommonMultiple(FACTION_ORDER.length, config.cityCounts.length),
  );
  const cache = new Map<number, SelfPlayResult>();
  let wins = 0;
  let draws = 0;
  for (let index = 0; index < config.games; index += 1) {
    const pattern = index % uniqueGames;
    const cached = cache.get(pattern);
    if (cached) {
      if (cached.candidateWon) wins += 1;
      if (!cached.winner) draws += 1;
      continue;
    }

    const candidateFaction = FACTION_ORDER[pattern % FACTION_ORDER.length];
    const cityCount = config.cityCounts[pattern % config.cityCounts.length];
    const policies = Object.fromEntries(FACTION_ORDER.map((faction) => {
      const policy = faction === candidateFaction ? config.candidate : config.opponents[faction];
      if (!policy) throw new Error(`Missing opponent policy for ${faction}`);
      return [faction, policy];
    })) as Record<FactionId, Policy>;
    const result = runSelfPlay({
      policies,
      firstFaction: candidateFaction,
      candidateFaction,
      cityCount,
      maxRounds: config.maxRounds,
      seed: config.seed + pattern,
      troopMultipliers: { [candidateFaction]: config.candidateTroopMultiplier },
    });
    cache.set(pattern, result);
    results.push(result);
    if (result.candidateWon) wins += 1;
    if (!result.winner) draws += 1;
  }

  return {
    games: config.games,
    wins,
    losses: config.games - wins - draws,
    draws,
    winRate: wins / config.games,
    results,
  };
}
