import { legalTargets } from './actions.ts';
import type { ActionMode, GameState, MoveCommand } from './types.ts';

export type AiDecision = { mode: ActionMode } & MoveCommand;

export interface Policy {
  name: string;
  chooseAction(state: GameState): AiDecision | undefined;
}

export function enumerateLegalActions(state: GameState): AiDecision[] {
  if (state.status !== 'playing' || state.actionsRemaining < 1) return [];
  const actions: AiDecision[] = [];
  const origins = Object.values(state.cities)
    .filter((city) => city.owner === state.turnFaction && city.troops > 1)
    .sort((left, right) => left.id.localeCompare(right.id));

  for (const origin of origins) {
    for (const mode of ['attack', 'transfer'] as const) {
      const targets = legalTargets(state, origin.id, mode)
        .sort((left, right) => left.id.localeCompare(right.id));
      for (const target of targets) {
        for (let troops = 1; troops < origin.troops; troops += 1) {
          actions.push({
            mode,
            originCityId: origin.id,
            targetCityId: target.id,
            troops,
          });
        }
      }
    }
  }

  return actions;
}
