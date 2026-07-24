import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { beginFactionTurn } from './actions.ts';
import { createHeuristicPolicy, trainedHeuristicWeights } from '../ai-training/heuristic-policy.ts';
import { chooseAiAction, chooseAiActionForLevel, chooseExpertAiAction, runAiTurn } from './ai.ts';
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

  it('selects normal or expert opponent policies explicitly', () => {
    const state = beginFactionTurn(createLiteScenario('wei', 24));
    state.turnFaction = 'shu';

    assert.deepEqual(chooseAiActionForLevel(state, 'normal'), chooseAiAction(state));
    assert.deepEqual(chooseAiActionForLevel(state, 'expert'), chooseExpertAiAction(state));
  });

  it('runs an expert turn when requested', () => {
    const state = beginFactionTurn(createLiteScenario('wei', 24));
    state.turnFaction = 'shu';
    const expert = runAiTurn(state, 'expert');
    const normal = runAiTurn(state, 'normal');

    assert.ok(expert.events.length <= 2);
    assert.equal(expert.state.actionsRemaining, 0);
    assert.notDeepEqual(expert, normal);
  });

  it('matches the offline trained v1 policy on representative openings', () => {
    const v1 = createHeuristicPolicy(trainedHeuristicWeights);
    for (const cityCount of [12, 18, 24] as const) {
      for (const playerFaction of ['wei', 'shu', 'wu'] as const) {
        const state = beginFactionTurn(createLiteScenario(playerFaction, cityCount, 'fair'));
        for (const turnFaction of ['wei', 'shu', 'wu'] as const) {
          const current = structuredClone(state);
          current.turnFaction = turnFaction;
          assert.deepEqual(chooseExpertAiAction(current), v1.chooseAction(current), `${cityCount}:${playerFaction}:${turnFaction}`);
        }
      }
    }
  });

  it('routes expert opponent through the shared heuristic runtime instead of a local copy', async () => {
    const source = await readFile(new URL('./ai.ts', import.meta.url), 'utf8');

    assert.match(source, /createHeuristicPolicy/);
    assert.doesNotMatch(source, /function expertActionScore/);
    assert.doesNotMatch(source, /function expertRolloutAction/);
  });
});
