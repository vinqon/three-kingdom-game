import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { FACTION_ORDER, type ScenarioCityCount } from '../game/scenario.ts';
import { createHeuristicPolicy, type HeuristicWeights } from './heuristic-policy.ts';
import { baselinePolicy, createRandomPolicy, type Policy } from './policies.ts';
import { runSelfPlay } from './self-play.ts';

export interface GaConfig {
  seed: number;
  baseWeights: HeuristicWeights;
  populationSize: number;
  generations: number;
  mutationRate: number;
  mutationScale: number;
  cityCounts: readonly ScenarioCityCount[];
  gamesPerCandidate: number;
  maxRounds: number;
  scenario: 'fair-baseline' | 'half-troops-24' | 'policy-self-play';
  opponentPolicy?: Policy;
  policyFactory?: (weights: HeuristicWeights) => Policy;
  onGeneration?: (summary: {
    generation: number;
    bestFitness: number;
    averageFitness: number;
    bestWeights: HeuristicWeights;
  }) => void;
}

export interface TrainingResult {
  bestWeights: HeuristicWeights;
  bestFitness: number;
  generations: Array<{ generation: number; bestFitness: number; averageFitness: number }>;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function mutate(
  weights: HeuristicWeights,
  random: () => number,
  rate: number,
  scale: number,
): HeuristicWeights {
  const next = { ...weights };
  for (const key of Object.keys(next) as Array<keyof HeuristicWeights>) {
    if (random() < rate) next[key] += (random() * 2 - 1) * scale;
  }
  return next;
}

function crossover(left: HeuristicWeights, right: HeuristicWeights, random: () => number): HeuristicWeights {
  const child = { ...left };
  for (const key of Object.keys(child) as Array<keyof HeuristicWeights>) {
    child[key] = random() < 0.5 ? left[key] : right[key];
  }
  return child;
}

function opponentPolicy(config: GaConfig, seed: number, gameIndex: number): Policy {
  if (config.opponentPolicy) return config.opponentPolicy;
  return gameIndex % 5 === 0 ? createRandomPolicy(seed + gameIndex) : baselinePolicy;
}

function candidateFitness(weights: HeuristicWeights, config: GaConfig, candidateIndex: number): number {
  const candidate = (config.policyFactory ?? createHeuristicPolicy)(weights);
  let score = 0;
  for (let game = 0; game < config.gamesPerCandidate; game += 1) {
    const candidateFaction = FACTION_ORDER[game % FACTION_ORDER.length];
    const cityCount = config.scenario === 'half-troops-24'
      ? 24
      : config.cityCounts[game % config.cityCounts.length];
    const policies = Object.fromEntries(FACTION_ORDER.map((faction) => [
      faction,
      faction === candidateFaction ? candidate : opponentPolicy(config, config.seed + candidateIndex * 997, game),
    ])) as Record<typeof candidateFaction, Policy>;
    const result = runSelfPlay({
      policies,
      firstFaction: candidateFaction,
      candidateFaction,
      cityCount,
      maxRounds: config.maxRounds,
      seed: config.seed + candidateIndex * 1000 + game,
      troopMultipliers: { [candidateFaction]: config.scenario === 'half-troops-24' ? 0.5 : 1 },
    });

    const enemyFactions = FACTION_ORDER.filter((faction) => faction !== candidateFaction);
    const strongestEnemyCities = Math.max(
      ...enemyFactions.map((faction) => result.metrics.finalCityCount[faction]),
    );
    const strongestEnemyTroops = Math.max(
      ...enemyFactions.map((faction) => result.metrics.finalTroops[faction]),
    );
    const cityLead = result.metrics.finalCityCount[candidateFaction] - strongestEnemyCities;
    const troopLead = result.metrics.finalTroops[candidateFaction] - strongestEnemyTroops;
    const finalCities = Object.values(result.finalState.cities);
    const enemyCapitalPressure = finalCities
      .filter((capital) => capital.capitalOf && capital.capitalOf !== candidateFaction)
      .reduce((sum, capital) => {
        if (capital.owner === candidateFaction) return sum + 2;
        const adjacentFoothold = capital.adjacentCityIds.some(
          (id) => result.finalState.cities[id].owner === candidateFaction,
        );
        return sum + (adjacentFoothold ? 1 : 0);
      }, 0);
    const enemyHomelandControl = finalCities
      .filter((city) => city.originalOwner !== candidateFaction && city.owner === candidateFaction)
      .length;
    const vulnerableCaptures = finalCities
      .filter((city) => city.owner === candidateFaction && city.originalOwner !== candidateFaction)
      .filter((city) => city.adjacentCityIds.some((id) => {
        const neighbor = result.finalState.cities[id];
        return neighbor.owner !== candidateFaction && neighbor.troops > city.troops;
      }))
      .length;

    if (result.candidateWon) score += 500;
    if (!result.winner) score -= 120;
    if (result.winner && !result.candidateWon) score -= 220;
    score += result.metrics.capitalsControlled[candidateFaction] * 260;
    score += enemyCapitalPressure * 90;
    score += enemyHomelandControl * 10;
    score += cityLead * 18;
    score += troopLead * 2;
    score += result.metrics.finalCityCount[candidateFaction] * 2;
    score += result.metrics.finalTroops[candidateFaction] * 0.25;
    score -= strongestEnemyCities * 6;
    score -= vulnerableCaptures * 18;
    score -= result.metrics.candidateLostCities * 28;
    score -= Math.max(0, result.metrics.ownershipChanges - result.metrics.candidateCaptures) * 2;
    score -= result.rounds * 0.75;
    score -= result.metrics.noActionTurns * 4;
  }
  return score / config.gamesPerCandidate;
}

export function trainGa(config: GaConfig): TrainingResult {
  const random = seededRandom(config.seed);
  let population = Array.from({ length: config.populationSize }, (_, index) =>
    index === 0 ? { ...config.baseWeights } : mutate(config.baseWeights, random, 1, config.mutationScale * 2),
  );
  const generations: TrainingResult['generations'] = [];
  let bestWeights = population[0];
  let bestFitness = Number.NEGATIVE_INFINITY;

  for (let generation = 0; generation < config.generations; generation += 1) {
    const ranked = population
      .map((weights, index) => ({ weights, fitness: candidateFitness(weights, config, index) }))
      .sort((left, right) => right.fitness - left.fitness);
    if (ranked[0].fitness > bestFitness) {
      bestFitness = ranked[0].fitness;
      bestWeights = ranked[0].weights;
    }
    const summary = {
      generation,
      bestFitness: ranked[0].fitness,
      averageFitness: ranked.reduce((sum, item) => sum + item.fitness, 0) / ranked.length,
      bestWeights: ranked[0].weights,
    };
    generations.push({
      generation: summary.generation,
      bestFitness: summary.bestFitness,
      averageFitness: summary.averageFitness,
    });
    config.onGeneration?.(summary);

    const eliteCount = Math.max(2, Math.floor(config.populationSize / 4));
    const elite = ranked.slice(0, eliteCount).map((item) => item.weights);
    population = Array.from({ length: config.populationSize }, (_, index) => {
      if (index < elite.length) return elite[index];
      const left = elite[Math.floor(random() * elite.length)];
      const right = elite[Math.floor(random() * elite.length)];
      return mutate(crossover(left, right, random), random, config.mutationRate, config.mutationScale);
    });
  }

  return { bestWeights, bestFitness, generations };
}

export function writeTrainingResult(result: TrainingResult, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
}
