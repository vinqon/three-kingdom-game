import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { beginFactionTurn } from '../game/actions.ts';
import { chooseAiAction } from '../game/ai.ts';
import { createLiteScenario } from '../game/scenario.ts';
import { baselinePolicy, createRandomPolicy, enumerateLegalActions } from './policies.ts';

describe('offline AI policies', () => {
  it('wraps the current deterministic AI as the baseline policy', () => {
    const state = beginFactionTurn(createLiteScenario('shu'));
    state.turnFaction = 'wu';
    state.cities.hefei.owner = 'wu';
    state.cities.hefei.troops = 9;
    state.cities.xuchang.troops = 2;
    state.cities.xiangyang.owner = 'shu';
    state.cities.xiangyang.troops = 1;

    assert.deepEqual(baselinePolicy.chooseAction(state), chooseAiAction(state));
  });

  it('enumerates only legal actions with every legal troop count', () => {
    const state = beginFactionTurn(createLiteScenario('wei'));
    const actions = enumerateLegalActions(state);

    assert.ok(actions.length > 0);
    assert.ok(actions.some((action) => action.originCityId === 'xuchang' && action.troops === 1));
    assert.ok(actions.some((action) => action.originCityId === 'xuchang' && action.troops === 5));
    for (const action of actions) {
      const origin = state.cities[action.originCityId];
      const target = state.cities[action.targetCityId];
      assert.equal(origin.owner, state.turnFaction);
      assert.ok(origin.adjacentCityIds.includes(target.id));
      assert.ok(origin.troops - action.troops >= 1);
      assert.equal(action.mode === 'transfer', target.owner === origin.owner);
      assert.equal(action.mode === 'attack', target.owner !== origin.owner);
    }
  });

  it('seeded random policy is deterministic and legal', () => {
    const state = beginFactionTurn(createLiteScenario('wei'));
    const first = createRandomPolicy(42).chooseAction(state);
    const second = createRandomPolicy(42).chooseAction(structuredClone(state));

    assert.deepEqual(first, second);
    assert.ok(first);
    assert.ok(enumerateLegalActions(state).some((action) => JSON.stringify(action) === JSON.stringify(first)));
  });
});
