import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { beginFactionTurn } from './actions.ts';
import { chooseAiAction, runAiTurn } from './ai.ts';
import { createLiteScenario } from './scenario.ts';

describe('two-action deterministic AI', () => {
  it('prefers a capturable original capital over an ordinary city', () => {
    const state = beginFactionTurn(createLiteScenario({
      playerFaction: 'shu',
      mapSize: 12,
      routeDensity: 'dense',
      difficulty: 'easy',
    }));
    state.turnFaction = 'wu';
    state.cities.wan.owner = 'wu';
    state.cities.wan.troops = 9;
    state.cities.xuchang.troops = 2;
    state.cities.xiangyang.owner = 'shu';
    state.cities.xiangyang.troops = 1;
    const decision = chooseAiAction(state);
    assert.deepEqual(decision, { mode: 'attack', originCityId: 'wan', targetCityId: 'xuchang', troops: 8 });
  });

  it('runs at most two legal actions and leaves every city occupied', () => {
    const state = beginFactionTurn(createLiteScenario('wei'));
    state.turnFaction = 'shu';
    const result = runAiTurn(state);
    assert.ok(result.events.length <= 2);
    assert.ok(Object.values(result.state.cities).every((city) => city.troops >= 1));
    assert.equal(result.state.actionsRemaining, 0);
  });

  it('reinforces a threatened capital before taking an ordinary winning attack', () => {
    const state = beginFactionTurn(createLiteScenario({
      playerFaction: 'shu',
      mapSize: 21,
      routeDensity: 'standard',
      difficulty: 'easy',
    }));
    state.turnFaction = 'wei';
    state.cities.xuchang.troops = 2;
    state.cities.wan.owner = 'shu';
    state.cities.wan.troops = 3;
    state.cities.luoyang.troops = 5;
    assert.deepEqual(chooseAiAction(state), {
      mode: 'transfer',
      originCityId: 'luoyang',
      targetCityId: 'xuchang',
      troops: 4,
    });
  });

  it('is deterministic for identical states', () => {
    const state = beginFactionTurn(createLiteScenario('wu'));
    state.turnFaction = 'wei';
    assert.deepEqual(runAiTurn(state), runAiTurn(structuredClone(state)));
  });

  it('moves rear troops toward the frontline closest to a remaining enemy capital', () => {
    const state = beginFactionTurn(createLiteScenario({
      playerFaction: 'shu',
      mapSize: 12,
      routeDensity: 'dense',
      difficulty: 'easy',
    }));
    state.turnFaction = 'wei';
    state.cities.chengdu.owner = 'wei';
    state.cities.chengdu.troops = 1;
    state.cities.xuchang.troops = 7;
    state.cities.wan.troops = 5;
    state.cities.xiangyang.troops = 2;
    state.cities.hefei.troops = 1;

    assert.deepEqual(chooseAiAction(state), {
      mode: 'transfer',
      originCityId: 'wan',
      targetCityId: 'xiangyang',
      troops: 4,
    });
  });
});
