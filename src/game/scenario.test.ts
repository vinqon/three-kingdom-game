import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CITY_DEFINITIONS, ROUTES, createLiteScenario } from './scenario.ts';

describe('twelve-city scenario', () => {
  it('creates four cities per faction with the approved starting troops', () => {
    const state = createLiteScenario('shu');
    assert.equal(Object.keys(state.cities).length, 12);
    assert.equal(state.turnFaction, 'shu');
    assert.equal(state.actionsRemaining, 0);

    for (const faction of ['wei', 'shu', 'wu']) {
      const owned = Object.values(state.cities).filter((city) => city.owner === faction);
      assert.equal(owned.length, 4);
      assert.equal(owned.filter((city) => city.capitalOf === faction).length, 1);
      assert.equal(owned.find((city) => city.capitalOf === faction)?.troops, 5);
      assert.ok(owned.filter((city) => !city.capitalOf).every((city) => city.troops === 3));
    }
  });

  it('uses one symmetric connected graph with eighteen unique routes', () => {
    const state = createLiteScenario('wei');
    assert.equal(ROUTES.length, 18);
    assert.deepEqual(
      ROUTES.map((route) => [...route].sort().join('~')).sort(),
      [
        'hefei~xuchang', 'wan~xuchang', 'wan~xiangyang', 'hefei~xiangyang',
        'chengdu~hanzhong', 'chengdu~yongan', 'hanzhong~jiangling', 'jiangling~yongan',
        'jianye~lujiang', 'chaisang~jianye', 'changsha~lujiang', 'chaisang~changsha',
        'hanzhong~wan', 'jiangling~xiangyang', 'hefei~lujiang', 'chaisang~xiangyang',
        'chaisang~yongan', 'changsha~jiangling',
      ].sort(),
    );

    for (const city of Object.values(state.cities)) {
      assert.ok(city.adjacentCityIds.length >= 2 && city.adjacentCityIds.length <= 4);
      for (const neighborId of city.adjacentCityIds) {
        assert.ok(state.cities[neighborId].adjacentCityIds.includes(city.id));
      }
    }

    const seen = new Set(['xuchang']);
    const queue = ['xuchang'];
    while (queue.length) {
      const current = queue.shift()!;
      for (const neighbor of state.cities[current].adjacentCityIds) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    assert.equal(seen.size, 12);
  });

  it('provides finite shared SVG coordinates and fresh state', () => {
    assert.equal(CITY_DEFINITIONS.length, 12);
    assert.ok(CITY_DEFINITIONS.every((city) => Number.isFinite(city.position.x) && Number.isFinite(city.position.y)));
    const first = createLiteScenario('wu');
    const second = createLiteScenario('wu');
    first.cities.jianye.troops = 99;
    assert.equal(second.cities.jianye.troops, 5);
  });
});
