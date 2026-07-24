import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { beginFactionTurn } from '../game/actions.ts';
import { createLiteScenario } from '../game/scenario.ts';
import {
  actionFeatures,
  createHeuristicPolicy,
  createV2Policy,
  defaultHeuristicWeights,
} from './heuristic-policy.ts';
import { enumerateLegalActions } from './policies.ts';

describe('offline parameterized heuristic policy', () => {
  it('exposes the 24-city strategic feature set', () => {
    const state = beginFactionTurn(createLiteScenario('wei', 24));
    const action = enumerateLegalActions(state)[0];
    const features = actionFeatures(state, action);

    assert.deepEqual(Object.keys(features).sort(), [
      'actionEfficiency',
      'capitalControlProgress',
      'capturableTarget',
      'capturedCityExposure',
      'capturedCityRecaptureRisk',
      'cityGain',
      'distanceToEnemyCapital',
      'enemyNearVictory',
      'frontlineReinforcement',
      'frontlineTroopRatio',
      'originExposure',
      'overkillPenalty',
      'ownCapitalSafety',
      'ownCapitalThreat',
      'ownCityRatio',
      'ownTroopRatio',
      'strongestEnemyCityRatio',
      'strongestEnemyTroopRatio',
      'targetCapital',
      'targetOwnerNearVictory',
      'troopGain',
      'winningMove',
    ]);
  });

  it('produces finite normalized features on every supported map size', () => {
    for (const cityCount of [12, 18, 24] as const) {
      const state = beginFactionTurn(createLiteScenario('wei', cityCount));
      for (const action of enumerateLegalActions(state)) {
        const features = actionFeatures(state, action);
        for (const value of Object.values(features)) {
          assert.ok(Number.isFinite(value));
          assert.ok(value >= -1 && value <= 1);
        }
      }
    }
  });

  it('chooses only legal actions and is deterministic', () => {
    const state = beginFactionTurn(createLiteScenario('shu', 18));
    state.turnFaction = 'wei';
    const policy = createHeuristicPolicy(defaultHeuristicWeights);
    const first = policy.chooseAction(state);
    const second = policy.chooseAction(structuredClone(state));

    assert.deepEqual(first, second);
    assert.ok(first);
    assert.ok(enumerateLegalActions(state).some((action) => JSON.stringify(action) === JSON.stringify(first)));
  });

  it('v2 policy chooses only legal actions and is deterministic', () => {
    const state = beginFactionTurn(createLiteScenario('shu', 24));
    state.turnFaction = 'wu';
    const policy = createV2Policy(defaultHeuristicWeights);
    const first = policy.chooseAction(state);
    const second = policy.chooseAction(structuredClone(state));

    assert.deepEqual(first, second);
    assert.ok(
      first === undefined ||
      enumerateLegalActions(state).some((action) => JSON.stringify(action) === JSON.stringify(first)),
    );
  });

  it('v2 policy captures a reachable enemy capital before ordinary expansion', () => {
    const state = beginFactionTurn(createLiteScenario('wei', 12));
    state.cities.lujiang.owner = 'wei';
    state.cities.lujiang.troops = 7;
    state.cities.jianye.troops = 5;
    const decision = createV2Policy(defaultHeuristicWeights).chooseAction(state);

    assert.deepEqual(decision, {
      mode: 'attack',
      originCityId: 'lujiang',
      targetCityId: 'jianye',
      troops: 6,
    });
  });

  it('v2 policy reinforces a bridgehead next to an enemy capital', () => {
    const state = beginFactionTurn(createLiteScenario('wei', 12));
    state.cities.lujiang.owner = 'wei';
    state.cities.lujiang.troops = 3;
    state.cities.hefei.troops = 7;
    state.cities.jianye.troops = 6;
    const decision = createV2Policy(defaultHeuristicWeights).chooseAction(state);

    assert.deepEqual(decision, {
      mode: 'transfer',
      originCityId: 'hefei',
      targetCityId: 'lujiang',
      troops: 6,
    });
  });
});
