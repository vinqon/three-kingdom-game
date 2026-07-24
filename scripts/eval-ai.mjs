import { baselinePolicy } from '../src/ai-training/policies.ts';
import { runEvaluationSuite } from '../src/ai-training/tournament.ts';

const summary = runEvaluationSuite({
  candidate: baselinePolicy,
  opponents: { wei: baselinePolicy, shu: baselinePolicy, wu: baselinePolicy },
  games: 30,
  cityCounts: [12, 18, 24],
  maxRounds: 120,
  candidateTroopMultiplier: 1,
  seed: 20260724,
});

console.log(JSON.stringify({
  games: summary.games,
  wins: summary.wins,
  losses: summary.losses,
  draws: summary.draws,
  winRate: summary.winRate,
}, null, 2));
