import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { beginFactionTurn } from './actions.ts';
import { chooseAiAction, runAiTurn } from './ai.ts';
import { createLiteScenario } from './scenario.ts';

describe('two-action deterministic AI', () => {
  it('prefers a capturable original capital over an ordinary city', () => {
    const state = beginFactionTurn(createLiteScenario('shu'));
    state.turnFaction = 'wu';
    state.cities.hefei.owner = 'wu';
    state.cities.hefei.troops = 9;
    state.cities.xuchang.troops = 2;
    state.cities.xiangyang.owner = 'shu';
    state.cities.xiangyang.troops = 1;
    const decision = chooseAiAction(state);
    assert.deepEqual(decision, { mode: 'attack', originCityId: 'hefei', targetCityId: 'xuchang', troops: 8 });
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
    const state = beginFactionTurn(createLiteScenario('wei'));
    state.turnFaction = 'wu';
    state.cities.jianye.troops = 2;
    state.cities.lujiang.owner = 'wei';
    state.cities.lujiang.troops = 3;
    state.cities.chaisang.troops = 5;
    state.cities.yongan.troops = 1;
    assert.deepEqual(chooseAiAction(state), {
      mode: 'transfer',
      originCityId: 'chaisang',
      targetCityId: 'jianye',
      troops: 4,
    });
  });

  it('is deterministic for identical states', () => {
    const state = beginFactionTurn(createLiteScenario('wu'));
    state.turnFaction = 'wei';
    assert.deepEqual(runAiTurn(state), runAiTurn(structuredClone(state)));
  });

  it('moves rear troops toward the frontline closest to a remaining enemy capital', () => {
    const state = beginFactionTurn(createLiteScenario('shu'));
    state.turnFaction = 'wei';
    state.cities.chengdu.owner = 'wei';
    state.cities.chengdu.troops = 1;
    state.cities.xuchang.troops = 7;
    state.cities.wan.troops = 5;
    state.cities.xiangyang.troops = 2;
    state.cities.hefei.troops = 1;

    assert.deepEqual(chooseAiAction(state), {
      mode: 'transfer',
      originCityId: 'xuchang',
      targetCityId: 'hefei',
      troops: 6,
    });
  });
});
