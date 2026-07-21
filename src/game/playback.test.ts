import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attack, beginFactionTurn, transfer } from './actions.ts';
import {
  createActionPlayback,
  nextPlaybackPhase,
  playbackDelay,
  visibleStateForPlayback,
} from './playback.ts';
import { createLiteScenario } from './scenario.ts';

describe('action playback model', () => {
  it('describes a successful attack without changing either input state', () => {
    const before = beginFactionTurn(createLiteScenario('wei'));
    before.cities.xiangyang.troops = 6;
    before.cities.jiangling.troops = 2;
    const command = { originCityId: 'xiangyang', targetCityId: 'jiangling', troops: 5 };
    const after = attack(before, command).state;

    const playback = createActionPlayback(before, after, 'attack', command);

    assert.equal(playback.outcome, 'captured');
    assert.equal(playback.originName, '襄阳');
    assert.equal(playback.targetName, '江陵');
    assert.equal(playback.afterTargetTroops, 3);
    assert.equal(before.cities.jiangling.owner, 'shu');
    assert.equal(after.cities.jiangling.owner, 'wei');
  });

  it('distinguishes transfer and held-attack outcomes', () => {
    const beforeTransfer = beginFactionTurn(createLiteScenario('wei'));
    const transferCommand = { originCityId: 'xuchang', targetCityId: 'wan', troops: 2 };
    const afterTransfer = transfer(beforeTransfer, transferCommand).state;
    assert.equal(
      createActionPlayback(beforeTransfer, afterTransfer, 'transfer', transferCommand).outcome,
      'transferred',
    );

    const beforeAttack = beginFactionTurn(createLiteScenario('wei'));
    const attackCommand = { originCityId: 'xiangyang', targetCityId: 'jiangling', troops: 1 };
    const afterAttack = attack(beforeAttack, attackCommand).state;
    assert.equal(
      createActionPlayback(beforeAttack, afterAttack, 'attack', attackCommand).outcome,
      'held',
    );
  });

  it('skips directly to resolve and exposes exact timing', () => {
    assert.equal(nextPlaybackPhase('announce', false), 'move');
    assert.equal(nextPlaybackPhase('move', false), 'resolve');
    assert.equal(nextPlaybackPhase('announce', true), 'resolve');
    assert.equal(nextPlaybackPhase('resolve', false), null);
    assert.equal(playbackDelay('ai', 'announce', false), 600);
    assert.equal(playbackDelay('ai', 'move', false), 800);
    assert.equal(playbackDelay('player', 'move', false), 450);
    assert.equal(playbackDelay('ai', 'move', true), 150);
  });

  it('normal and skipped playback expose the exact same final state and log', () => {
    const before = beginFactionTurn(createLiteScenario('wei'));
    before.cities.xiangyang.troops = 6;
    before.cities.jiangling.troops = 2;
    const command = { originCityId: 'xiangyang', targetCityId: 'jiangling', troops: 5 };
    const after = attack(before, command).state;

    assert.equal(visibleStateForPlayback(before, after, 'announce'), before);
    assert.equal(visibleStateForPlayback(before, after, 'move'), before);
    const normalFinal = visibleStateForPlayback(before, after, 'resolve');
    const skippedPhase = nextPlaybackPhase('announce', true);
    assert.equal(skippedPhase, 'resolve');
    const skippedFinal = visibleStateForPlayback(before, after, skippedPhase);

    assert.deepEqual(skippedFinal, normalFinal);
    assert.deepEqual(skippedFinal.log, after.log);
  });
});
