import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { baselinePolicy, createRandomPolicy } from './policies.ts';
import { applyTroopMultiplier, runSelfPlay } from './self-play.ts';

describe('offline self-play runner', () => {
  it('is deterministic for identical policies and seed', () => {
    const config = {
      policies: { wei: baselinePolicy, shu: createRandomPolicy(7), wu: createRandomPolicy(9) },
      firstFaction: 'wei' as const,
      candidateFaction: 'wei' as const,
      cityCount: 12 as const,
      maxRounds: 80,
      seed: 123,
    };

    assert.deepEqual(runSelfPlay(config), runSelfPlay(config));
  });

  it('terminates with a winner or bounded non-winner reason', () => {
    const result = runSelfPlay({
      policies: { wei: baselinePolicy, shu: baselinePolicy, wu: baselinePolicy },
      firstFaction: 'wei',
      candidateFaction: 'wei',
      cityCount: 12,
      maxRounds: 60,
      seed: 1,
    });

    assert.ok(result.rounds <= 60);
    assert.ok(result.winner || result.terminationReason === 'maxRounds' || result.terminationReason === 'stalled');
    assert.ok(result.metrics.totalActions >= 0);
    assert.ok(result.metrics.ownershipChanges >= 0);
    assert.ok(result.metrics.candidateCaptures >= 0);
    assert.ok(result.metrics.candidateLostCities >= 0);
  });

  it('starts from fair easy troops before optional handicap is applied', () => {
    const result = runSelfPlay({
      policies: { wei: baselinePolicy, shu: baselinePolicy, wu: baselinePolicy },
      firstFaction: 'wei',
      candidateFaction: 'wei',
      cityCount: 12,
      maxRounds: 1,
      seed: 1,
    });

    assert.equal(result.initialTroopsByFaction.wei, result.initialTroopsByFaction.shu);
    assert.equal(result.initialTroopsByFaction.shu, result.initialTroopsByFaction.wu);
  });

  it('can apply an exact half-troop handicap to one faction on 24 cities', () => {
    const state = runSelfPlay({
      policies: { wei: baselinePolicy, shu: baselinePolicy, wu: baselinePolicy },
      firstFaction: 'wei',
      candidateFaction: 'wei',
      cityCount: 24,
      maxRounds: 0,
      seed: 1,
      troopMultipliers: { wei: 0.5 },
    }).initialState;

    const weiTroops = Object.values(state.cities)
      .filter((city) => city.owner === 'wei')
      .reduce((sum, city) => sum + city.troops, 0);
    const shuTroops = Object.values(state.cities)
      .filter((city) => city.owner === 'shu')
      .reduce((sum, city) => sum + city.troops, 0);

    assert.equal(weiTroops, Math.round(shuTroops * 0.5));
  });

  it('scales a faction without emptying any city', () => {
    const result = runSelfPlay({
      policies: { wei: baselinePolicy, shu: baselinePolicy, wu: baselinePolicy },
      firstFaction: 'wei',
      candidateFaction: 'wei',
      cityCount: 24,
      maxRounds: 0,
      seed: 1,
    });
    const scaled = applyTroopMultiplier(result.initialState, 'wei', 0.5);

    assert.ok(Object.values(scaled.cities).every((city) => city.troops >= 1));
  });
});
