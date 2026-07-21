import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { beginFactionTurn } from './actions.ts';
import { CITY_DEFINITIONS, ROUTES, createLiteScenario } from './scenario.ts';

function connectedCityCount(state: ReturnType<typeof createLiteScenario>, startCityId: string, allowedOwner?: string): number {
  const seen = new Set([startCityId]);
  const queue = [startCityId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbor of state.cities[current].adjacentCityIds) {
      if (allowedOwner && state.cities[neighbor].owner !== allowedOwner) continue;
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return seen.size;
}

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

  it('applies easy, medium, and hard initial troop levels', () => {
    const easy = createLiteScenario('shu', 12, 'easy');
    assert.equal(easy.cities.chengdu.troops, 5);
    assert.equal(easy.cities.hanzhong.troops, 3);
    assert.equal(easy.cities.xuchang.troops, 5);

    const medium = beginFactionTurn(createLiteScenario('shu', 12, 'medium'));
    assert.ok(Object.values(medium.cities).every((city) => city.troops === 4));

    const hard = beginFactionTurn(createLiteScenario('shu', 12, 'hard'));
    assert.equal(hard.cities.chengdu.troops, 4);
    assert.equal(hard.cities.hanzhong.troops, 2);
    assert.equal(hard.cities.xuchang.troops, 5);
    assert.equal(hard.cities.wan.troops, 3);
  });

  it('creates selectable eighteen and twenty-four city campaigns with clustered sparse roads', () => {
    for (const [cityCount, perFaction] of [[18, 6], [24, 8]] as const) {
      const state = createLiteScenario('wei', cityCount);
      assert.equal(Object.keys(state.cities).length, cityCount);
      assert.equal(connectedCityCount(state, 'xuchang'), cityCount);

      for (const faction of ['wei', 'shu', 'wu']) {
        const owned = Object.values(state.cities).filter((city) => city.owner === faction);
        const capital = owned.find((city) => city.capitalOf === faction);
        assert.equal(owned.length, perFaction);
        assert.ok(capital);
        assert.equal(connectedCityCount(state, capital.id, faction), perFaction);
      }

      const routeKeys = new Set<string>();
      for (const city of Object.values(state.cities)) {
        assert.ok(city.adjacentCityIds.length >= 1 && city.adjacentCityIds.length <= 4, city.id);
        for (const neighborId of city.adjacentCityIds) {
          assert.ok(state.cities[neighborId].adjacentCityIds.includes(city.id));
          routeKeys.add([city.id, neighborId].sort().join('~'));
        }
      }
      assert.ok(routeKeys.has('wan~ye'));
      assert.ok(routeKeys.has('ba~hanzhong'));
      assert.ok(routeKeys.has('guangling~wujun'));
      if (cityCount === 24) assert.ok(routeKeys.has('jianye~yuzhang'));
      assert.equal(routeKeys.size * 2, Object.values(state.cities).reduce((sum, city) => sum + city.adjacentCityIds.length, 0));
    }
  });
});
