import { baselinePolicy } from './policies.ts';
import { createHeuristicPolicy, trainedHeuristicWeights } from './heuristic-policy.ts';
import { runEvaluationSuite } from './tournament.ts';

export function runTrainedAcceptance() {
  const trained = createHeuristicPolicy(trainedHeuristicWeights);
  const fair = runEvaluationSuite({
    candidate: trained,
    opponents: { wei: baselinePolicy, shu: baselinePolicy, wu: baselinePolicy },
    games: 100,
    cityCounts: [12, 18, 24],
    maxRounds: 160,
    candidateTroopMultiplier: 1,
    seed: 20260724,
  });
  const halfTroops24 = runEvaluationSuite({
    candidate: trained,
    opponents: { wei: baselinePolicy, shu: baselinePolicy, wu: baselinePolicy },
    games: 100,
    cityCounts: [24],
    maxRounds: 180,
    candidateTroopMultiplier: 0.5,
    seed: 20260725,
  });

  return {
    fair,
    halfTroops24,
    passed: fair.wins === 100 && halfTroops24.wins >= 90,
  };
}
