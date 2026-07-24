import { mkdir, writeFile } from 'node:fs/promises';

import { defaultHeuristicWeights, trainedHeuristicWeights } from '../src/ai-training/heuristic-policy.ts';
import { trainGa, writeTrainingResult } from '../src/ai-training/ga.ts';

const fair = trainGa({
  seed: 20260724,
  baseWeights: trainedHeuristicWeights,
  populationSize: 2,
  generations: 1,
  mutationRate: 0.22,
  mutationScale: 1.2,
  cityCounts: [12, 18, 24],
  gamesPerCandidate: 1,
  maxRounds: 60,
  scenario: 'fair-baseline',
});

const handicap = trainGa({
  seed: 20260725,
  baseWeights: fair.bestWeights ?? defaultHeuristicWeights,
  populationSize: 2,
  generations: 1,
  mutationRate: 0.24,
  mutationScale: 1.4,
  cityCounts: [24],
  gamesPerCandidate: 1,
  maxRounds: 80,
  scenario: 'half-troops-24',
});

await mkdir('artifacts/ai-training', { recursive: true });
await writeFile('artifacts/ai-training/best-weights.json', JSON.stringify(handicap.bestWeights, null, 2), 'utf8');
writeTrainingResult({
  bestWeights: handicap.bestWeights,
  bestFitness: handicap.bestFitness,
  generations: [...fair.generations, ...handicap.generations],
}, 'artifacts/ai-training/training-report.json');

console.log(JSON.stringify({
  fairBestFitness: fair.bestFitness,
  handicapBestFitness: handicap.bestFitness,
  bestWeights: handicap.bestWeights,
}, null, 2));
