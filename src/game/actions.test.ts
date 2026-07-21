import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  attack,
  beginFactionTurn,
  endFactionTurn,
  legalTargets,
  reinforceFaction,
  transfer,
} from './actions.ts';
import { createLiteScenario } from './scenario.ts';
import { GameRuleError } from './types.ts';

describe('turn reinforcement and actions', () => {
  it('reinforces every owned city up to its automatic threshold', () => {
    const state = createLiteScenario('wei');
    state.cities.wan.troops = 6;
    state.cities.xuchang.troops = 8;
    const next = reinforceFaction(state, 'wei');
    assert.equal(next.cities.wan.troops, 6);
    assert.equal(next.cities.xuchang.troops, 8);
    assert.equal(next.cities.xiangyang.troops, 4);
    assert.equal(next.cities.chengdu.troops, 5);
  });

  it('begins a faction turn with two actions and automatic reinforcement', () => {
    const state = beginFactionTurn(createLiteScenario('shu'));
    assert.equal(state.actionsRemaining, 2);
    assert.equal(state.cities.chengdu.troops, 6);
    assert.equal(state.cities.hanzhong.troops, 4);
    assert.match(state.log.at(-1)?.message ?? '', /自动增兵/);
  });

  it('transfers between adjacent friendly cities and leaves one behind', () => {
    const state = beginFactionTurn(createLiteScenario('wei'));
    const result = transfer(state, { originCityId: 'xuchang', targetCityId: 'wan', troops: 5 });
    assert.equal(result.state.cities.xuchang.troops, 1);
    assert.equal(result.state.cities.wan.troops, 9);
    assert.equal(result.state.actionsRemaining, 1);
    assert.match(result.message, /许昌.*宛城.*5/);
  });

  it('resolves attack win, loss, and tie by subtraction', () => {
    const winning = beginFactionTurn(createLiteScenario('wei'));
    winning.cities.wan.troops = 6;
    winning.cities.hanzhong.troops = 3;
    const won = attack(winning, { originCityId: 'wan', targetCityId: 'hanzhong', troops: 5 });
    assert.equal(won.state.cities.hanzhong.owner, 'wei');
    assert.equal(won.state.cities.hanzhong.troops, 2);

    const losing = beginFactionTurn(createLiteScenario('wei'));
    losing.cities.wan.troops = 4;
    losing.cities.hanzhong.troops = 5;
    const lost = attack(losing, { originCityId: 'wan', targetCityId: 'hanzhong', troops: 3 });
    assert.equal(lost.state.cities.hanzhong.owner, 'shu');
    assert.equal(lost.state.cities.hanzhong.troops, 2);

    const tying = beginFactionTurn(createLiteScenario('wei'));
    tying.cities.wan.troops = 5;
    tying.cities.hanzhong.troops = 4;
    const tied = attack(tying, { originCityId: 'wan', targetCityId: 'hanzhong', troops: 4 });
    assert.equal(tied.state.cities.hanzhong.owner, 'shu');
    assert.equal(tied.state.cities.hanzhong.troops, 1);
  });

  it('lists only adjacent legal targets for each mode', () => {
    const state = beginFactionTurn(createLiteScenario('wei'));
    assert.deepEqual(legalTargets(state, 'wan', 'transfer').map((city) => city.id), ['xuchang', 'xiangyang']);
    assert.deepEqual(legalTargets(state, 'wan', 'attack').map((city) => city.id), ['hanzhong']);
  });

  it('rejects illegal routes, owners, counts, and a third action', () => {
    const state = beginFactionTurn(createLiteScenario('wei'));
    assert.throws(() => transfer(state, { originCityId: 'xuchang', targetCityId: 'chengdu', troops: 1 }), GameRuleError);
    assert.throws(() => transfer(state, { originCityId: 'chengdu', targetCityId: 'hanzhong', troops: 1 }), GameRuleError);
    assert.throws(() => transfer(state, { originCityId: 'xuchang', targetCityId: 'wan', troops: 6 }), GameRuleError);
    assert.throws(() => transfer(state, { originCityId: 'xuchang', targetCityId: 'wan', troops: 1.5 }), GameRuleError);

    const once = transfer(state, { originCityId: 'xuchang', targetCityId: 'wan', troops: 1 }).state;
    const twice = transfer(once, { originCityId: 'wan', targetCityId: 'xuchang', troops: 1 }).state;
    assert.equal(twice.actionsRemaining, 0);
    assert.throws(() => transfer(twice, { originCityId: 'xiangyang', targetCityId: 'hefei', troops: 1 }), GameRuleError);
  });

  it('advances in player-relative cyclic order and reinforces the next faction', () => {
    const state = beginFactionTurn(createLiteScenario('shu'));
    const next = endFactionTurn(state);
    assert.equal(next.turnFaction, 'wu');
    assert.equal(next.actionsRemaining, 2);
    assert.equal(next.cities.jianye.troops, 6);
  });
});
