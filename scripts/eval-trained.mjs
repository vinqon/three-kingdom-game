import { runTrainedAcceptance } from '../src/ai-training/acceptance.ts';

function compact(summary) {
  return {
    games: summary.games,
    wins: summary.wins,
    losses: summary.losses,
    draws: summary.draws,
    winRate: summary.winRate,
  };
}

const { fair, halfTroops24, passed } = runTrainedAcceptance();

console.log(JSON.stringify({
  fair: compact(fair),
  halfTroops24: compact(halfTroops24),
  passed,
}, null, 2));

if (!passed) process.exitCode = 1;
