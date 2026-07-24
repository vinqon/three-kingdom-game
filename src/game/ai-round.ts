import { attack, endFactionTurn, transfer } from './actions.ts';
import { chooseAiActionForLevel, type AiDecision, type AiLevel } from './ai.ts';
import type { FactionId, GameState } from './types.ts';

export interface AiTurnStartEvent {
  type: 'turn-start';
  faction: FactionId;
  beforeState: GameState;
  state: GameState;
  reinforcedCityIds: string[];
}

export interface AiActionEvent {
  type: 'action';
  faction: FactionId;
  beforeState: GameState;
  state: GameState;
  decision: AiDecision;
  message: string;
}

export type AiRoundEvent = AiTurnStartEvent | AiActionEvent;

export type AiRoundObserver = (event: AiRoundEvent) => void | Promise<void>;

function reinforcedCityIds(
  before: GameState,
  after: GameState,
  faction: FactionId,
): string[] {
  return Object.values(after.cities)
    .filter((city) =>
      city.owner === faction
      && city.troops === before.cities[city.id].troops + 1,
    )
    .map((city) => city.id)
    .sort();
}

export async function runAiRoundUntilPlayer(
  state: GameState,
  observer: AiRoundObserver = () => {},
  aiLevel: AiLevel = 'normal',
): Promise<GameState> {
  let beforeTurn = state;
  let next = endFactionTurn(state);
  let factionGuard = 0;

  while (next.status === 'playing' && next.turnFaction !== next.playerFaction && factionGuard < 3) {
    const actingFaction = next.turnFaction;
    await observer({
      type: 'turn-start',
      faction: actingFaction,
      beforeState: beforeTurn,
      state: next,
      reinforcedCityIds: reinforcedCityIds(beforeTurn, next, actingFaction),
    });

    let actionGuard = 0;
    while (next.status === 'playing' && next.actionsRemaining > 0 && actionGuard < 2) {
      const decision = chooseAiActionForLevel(next, aiLevel);
      if (!decision) break;
      const beforeState = next;
      const result = decision.mode === 'attack'
        ? attack(next, decision)
        : transfer(next, decision);
      next = result.state;
      await observer({
        type: 'action',
        faction: actingFaction,
        beforeState,
        state: next,
        decision,
        message: result.message,
      });
      actionGuard += 1;
    }

    if (next.status === 'playing') {
      beforeTurn = next;
      next = endFactionTurn(next);
    }
    factionGuard += 1;
  }

  return next;
}
