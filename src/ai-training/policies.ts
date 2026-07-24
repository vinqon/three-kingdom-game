import { legalTargets } from '../game/actions.ts';
import { chooseAiAction, type AiDecision } from '../game/ai.ts';
import type { GameState } from '../game/types.ts';

export type { AiDecision };

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

function nextRandom(seed: number): number {
  let value = seed >>> 0;
  for (let index = 0; index < 3; index += 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
  }
  return value / 0x100000000;
}

function stateHash(state: GameState): number {
  const text = [
    state.round,
    state.turnFaction,
    state.actionsRemaining,
    ...Object.values(state.cities)
      .sort((left, right) => left.id.localeCompare(right.id))
      .flatMap((city) => [city.id, city.owner, city.troops]),
  ].join('|');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const baselinePolicy: Policy = {
  name: 'baseline',
  chooseAction: chooseAiAction,
};

export function createRandomPolicy(seed: number): Policy {
  return {
    name: `random-${seed}`,
    chooseAction(state) {
      const actions = enumerateLegalActions(state);
      if (actions.length === 0) return undefined;
      return actions[Math.floor(nextRandom(seed ^ stateHash(state)) * actions.length)];
    },
  };
}
