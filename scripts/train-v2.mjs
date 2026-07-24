import { mkdir, writeFile } from 'node:fs/promises';

import {
  createHeuristicPolicy,
  createV2Policy,
  trainedHeuristicWeights,
} from '../src/ai-training/heuristic-policy.ts';
import { trainGa } from '../src/ai-training/ga.ts';
import { runEvaluationSuite } from '../src/ai-training/tournament.ts';

const v1 = createHeuristicPolicy(trainedHeuristicWeights);
const populationSize = Number.parseInt(process.env.POPULATION ?? '2', 10);
const generations = Number.parseInt(process.env.GENERATIONS ?? '6', 10);
const gamesPerCandidate = Number.parseInt(process.env.GAMES_PER_CANDIDATE ?? '1', 10);
const quickGames = Number.parseInt(process.env.QUICK_GAMES ?? '1', 10);
const maxRounds = Number.parseInt(process.env.MAX_ROUNDS ?? '70', 10);
const fast = process.env.FAST === '1';

function evaluateV2(weights, games = quickGames) {
  const v2 = createV2Policy(weights, undefined, { useRollout: !fast });
  return runEvaluationSuite({
    candidate: v2,
    opponents: { wei: v1, shu: v1, wu: v1 },
    games,
    cityCounts: [24],
    maxRounds,
    candidateTroopMultiplier: 1,
    seed: 20260726,
  });
}

console.log(JSON.stringify({
  event: 'v2-training-start',
  baseline: 'v1',
  candidate: 'v2',
  quickEval: {
    games: quickGames,
    cityCounts: [24],
    maxRounds,
  },
  ga: {
    populationSize,
    generations,
    gamesPerCandidate,
    fast,
  },
}));

let bestWeights = trainedHeuristicWeights;
const initialEvaluation = evaluateV2(bestWeights, quickGames);
console.log(JSON.stringify({
  event: 'generation',
  generation: -1,
  fitness: null,
  averageFitness: null,
  wins: initialEvaluation.wins,
  games: initialEvaluation.games,
  winRate: initialEvaluation.winRate,
  losses: initialEvaluation.losses,
  draws: initialEvaluation.draws,
}));

const result = trainGa({
  seed: 20260726,
  baseWeights: trainedHeuristicWeights,
  policyFactory: (weights) => createV2Policy(weights, undefined, { useRollout: !fast }),
  opponentPolicy: v1,
  populationSize,
  generations,
  mutationRate: 0.45,
  mutationScale: 8,
  cityCounts: [24],
  gamesPerCandidate,
  maxRounds,
  scenario: 'policy-self-play',
  onGeneration: (summary) => {
    bestWeights = summary.bestWeights;
    const evaluation = evaluateV2(summary.bestWeights, quickGames);
    console.log(JSON.stringify({
      event: 'generation',
      generation: summary.generation,
      fitness: summary.bestFitness,
      averageFitness: summary.averageFitness,
      wins: evaluation.wins,
      games: evaluation.games,
      winRate: evaluation.winRate,
      losses: evaluation.losses,
      draws: evaluation.draws,
    }));
  },
});

bestWeights = result.bestWeights;
const finalEvaluation = evaluateV2(bestWeights, 3);

await mkdir('artifacts/ai-training', { recursive: true });
await writeFile('artifacts/ai-training/v2-weights.json', JSON.stringify(bestWeights, null, 2), 'utf8');
await writeFile('artifacts/ai-training/v2-training-report.json', JSON.stringify({
  result,
  finalEvaluation: {
    games: finalEvaluation.games,
    wins: finalEvaluation.wins,
    losses: finalEvaluation.losses,
    draws: finalEvaluation.draws,
    winRate: finalEvaluation.winRate,
  },
}, null, 2), 'utf8');

console.log(JSON.stringify({
  event: 'v2-training-complete',
  fitness: result.bestFitness,
  finalEvaluation: {
    games: finalEvaluation.games,
    wins: finalEvaluation.wins,
    losses: finalEvaluation.losses,
    draws: finalEvaluation.draws,
    winRate: finalEvaluation.winRate,
  },
  artifact: 'artifacts/ai-training/v2-weights.json',
}));
