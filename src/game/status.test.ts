import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateStatus } from './actions.ts';
import { createLiteScenario } from './scenario.ts';

describe('capital victory and defeat', () => {
  it('declares player victory after controlling both enemy original capitals', () => {
    const state = createLiteScenario('shu');
    state.cities.xuchang.owner = 'shu';
    state.cities.jianye.owner = 'shu';
    const next = evaluateStatus(state);
    assert.equal(next.status, 'victory');
    assert.equal(next.winner, 'shu');
  });

  it('declares defeat when an AI controls the other two capitals', () => {
    const state = createLiteScenario('wei');
    state.cities.chengdu.owner = 'wu';
    state.cities.xuchang.owner = 'wu';
    const next = evaluateStatus(state);
    assert.equal(next.status, 'defeat');
    assert.equal(next.winner, 'wu');
  });

  it('does not end the game merely because the player loses the capital', () => {
    const state = createLiteScenario('wei');
    state.cities.xuchang.owner = 'shu';
    assert.equal(evaluateStatus(state).status, 'playing');
  });

  it('declares defeat when the player owns no cities', () => {
    const state = createLiteScenario('wu');
    for (const city of Object.values(state.cities)) {
      if (city.owner === 'wu') city.owner = 'wei';
    }
    assert.equal(evaluateStatus(state).status, 'defeat');
  });
});
