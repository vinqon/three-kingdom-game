import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createV2Policy, defaultHeuristicWeights } from './heuristic-policy.ts';
import { trainGa } from './ga.ts';
import { createRandomPolicy } from './policies.ts';

describe('genetic heuristic training', () => {
  it('is deterministic for a fixed seed and tiny population', () => {
    const config = {
      seed: 99,
      baseWeights: defaultHeuristicWeights,
      populationSize: 2,
      generations: 1,
      mutationRate: 0.2,
      mutationScale: 0.5,
      cityCounts: [12] as const,
      gamesPerCandidate: 1,
      maxRounds: 8,
      scenario: 'fair-baseline' as const,
    };

    assert.deepEqual(trainGa(config), trainGa(config));
  });

  it('returns finite weights and generation fitness summaries', () => {
    const result = trainGa({
      seed: 5,
      baseWeights: defaultHeuristicWeights,
      populationSize: 2,
      generations: 1,
      mutationRate: 0.25,
      mutationScale: 0.25,
      cityCounts: [12] as const,
      gamesPerCandidate: 1,
      maxRounds: 8,
      scenario: 'fair-baseline',
    });

    assert.ok(Number.isFinite(result.bestFitness));
    for (const value of Object.values(result.bestWeights)) assert.ok(Number.isFinite(value));
    assert.equal(result.generations.length, 1);
  });

  it('can train against an explicit opponent policy instead of the baseline', () => {
    const opponent = createRandomPolicy(123);
    const result = trainGa({
      seed: 11,
      baseWeights: defaultHeuristicWeights,
      opponentPolicy: opponent,
      populationSize: 2,
      generations: 1,
      mutationRate: 0.25,
      mutationScale: 0.25,
      cityCounts: [12] as const,
      gamesPerCandidate: 1,
      maxRounds: 8,
      scenario: 'policy-self-play',
    });

    assert.ok(Number.isFinite(result.bestFitness));
    assert.deepEqual(result.generations.map((item) => item.generation), [0]);
  });

  it('can train an alternate policy factory and report generation progress', () => {
    const progress: number[] = [];
    const result = trainGa({
      seed: 12,
      baseWeights: defaultHeuristicWeights,
      policyFactory: createV2Policy,
      opponentPolicy: createRandomPolicy(456),
      populationSize: 2,
      generations: 2,
      mutationRate: 0.25,
      mutationScale: 0.25,
      cityCounts: [12] as const,
      gamesPerCandidate: 1,
      maxRounds: 8,
      scenario: 'policy-self-play',
      onGeneration: (summary) => progress.push(summary.generation),
    });

    assert.ok(Number.isFinite(result.bestFitness));
    assert.deepEqual(progress, [0, 1]);
  });
});
