import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { beginFactionTurn } from './actions.ts';
import { CITY_DEFINITIONS, createLiteScenario, routesForScenario } from './scenario.ts';

const FACTIONS = ['wei', 'shu', 'wu'] as const;
const MAP_SIZES = [12, 21, 33] as const;
const DENSITIES = ['sparse', 'standard', 'dense'] as const;

function routeClearance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): { projection: number; distance: number } {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  const projection = (
    (point.x - start.x) * deltaX + (point.y - start.y) * deltaY
  ) / lengthSquared;
  const projectedX = start.x + projection * deltaX;
  const projectedY = start.y + projection * deltaY;
  return {
    projection,
    distance: Math.hypot(point.x - projectedX, point.y - projectedY),
  };
}

describe('configurable campaign scenario', () => {
  it('creates deterministic 12, 21, and 33 city maps with equal factions', () => {
    for (const mapSize of MAP_SIZES) {
      const state = createLiteScenario({
        playerFaction: 'shu',
        mapSize,
        routeDensity: 'standard',
        difficulty: 'normal',
      });

      assert.equal(Object.keys(state.cities).length, mapSize);
      assert.deepEqual(state.scenario, { mapSize, routeDensity: 'standard', difficulty: 'normal' });
      assert.equal(state.turnFaction, 'shu');

      for (const faction of FACTIONS) {
        const owned = Object.values(state.cities).filter((city) => city.owner === faction);
        assert.equal(owned.length, mapSize / 3);
        assert.equal(owned.filter((city) => city.capitalOf === faction).length, 1);
      }
    }
  });

  it('keeps the faction-only constructor compatible with the original standard map', () => {
    const state = createLiteScenario('wei');
    assert.equal(Object.keys(state.cities).length, 12);
    assert.deepEqual(state.scenario, { mapSize: 12, routeDensity: 'standard', difficulty: 'easy' });
    assert.deepEqual(state.cities.wan.adjacentCityIds.sort(), ['hanzhong', 'xiangyang', 'xuchang']);
  });

  it('builds unique connected route tiers without capital-to-capital links', () => {
    for (const mapSize of MAP_SIZES) {
      const counts: number[] = [];

      for (const routeDensity of DENSITIES) {
        const routes = routesForScenario(mapSize, routeDensity);
        const state = createLiteScenario({
          playerFaction: 'wei',
          mapSize,
          routeDensity,
          difficulty: 'easy',
        });
        counts.push(routes.length);

        const keys = routes.map(([left, right]) => [left, right].sort().join('~'));
        assert.equal(new Set(keys).size, routes.length);

        for (const [left, right] of routes) {
          assert.ok(state.cities[left]);
          assert.ok(state.cities[right]);
          assert.ok(state.cities[left].adjacentCityIds.includes(right));
          assert.ok(state.cities[right].adjacentCityIds.includes(left));
          assert.equal(Boolean(state.cities[left].capitalOf && state.cities[right].capitalOf), false);
        }

        const firstId = Object.keys(state.cities)[0];
        const seen = new Set([firstId]);
        const queue = [firstId];
        while (queue.length) {
          const current = queue.shift()!;
          for (const neighbor of state.cities[current].adjacentCityIds) {
            if (!seen.has(neighbor)) {
              seen.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        assert.equal(seen.size, mapSize);
      }

      assert.ok(counts[0] < counts[1]);
      assert.ok(counts[1] < counts[2]);
    }
  });

  it('keeps every static route clear of third-city markers', () => {
    for (const mapSize of MAP_SIZES) {
      for (const routeDensity of DENSITIES) {
        const state = createLiteScenario({
          playerFaction: 'wei',
          mapSize,
          routeDensity,
          difficulty: 'easy',
        });

        for (const [leftId, rightId] of routesForScenario(mapSize, routeDensity)) {
          const left = state.cities[leftId];
          const right = state.cities[rightId];
          for (const city of Object.values(state.cities)) {
            if (city.id === leftId || city.id === rightId) continue;
            const clearance = routeClearance(city.position, left.position, right.position);
            const blocksRoute = clearance.projection > 0.08
              && clearance.projection < 0.92
              && clearance.distance < 36;
            assert.equal(
              blocksRoute,
              false,
              `${mapSize}/${routeDensity}: ${left.name}—${right.name} passes ${city.name}`,
            );
          }
        }
      }
    }
  });

  it('applies easy, normal, and hard player troop relationships after turn start', () => {
    const expected = {
      easy: { playerCapital: 6, playerCity: 4, aiCapital: 5, aiCity: 3 },
      normal: { playerCapital: 5, playerCity: 3, aiCapital: 5, aiCity: 3 },
      hard: { playerCapital: 4, playerCity: 2, aiCapital: 5, aiCity: 3 },
    } as const;

    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const state = beginFactionTurn(createLiteScenario({
        playerFaction: 'wu',
        mapSize: 33,
        routeDensity: 'standard',
        difficulty,
      }));
      const playerCapital = Object.values(state.cities).find((city) => city.capitalOf === 'wu')!;
      const playerCity = Object.values(state.cities).find((city) => city.owner === 'wu' && !city.capitalOf)!;
      const aiCapital = Object.values(state.cities).find((city) => city.capitalOf === 'wei')!;
      const aiCity = Object.values(state.cities).find((city) => city.owner === 'wei' && !city.capitalOf)!;

      assert.equal(playerCapital.troops, expected[difficulty].playerCapital);
      assert.equal(playerCity.troops, expected[difficulty].playerCity);
      assert.equal(aiCapital.troops, expected[difficulty].aiCapital);
      assert.equal(aiCity.troops, expected[difficulty].aiCity);
    }
  });

  it('provides 33 finite canonical coordinates and fresh state objects', () => {
    assert.equal(CITY_DEFINITIONS.length, 33);
    assert.ok(CITY_DEFINITIONS.every((city) => Number.isFinite(city.position.x) && Number.isFinite(city.position.y)));
    assert.ok(CITY_DEFINITIONS.every((city) => city.position.y >= 45 && city.position.y <= 630));
    for (let leftIndex = 0; leftIndex < CITY_DEFINITIONS.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < CITY_DEFINITIONS.length; rightIndex += 1) {
        const left = CITY_DEFINITIONS[leftIndex];
        const right = CITY_DEFINITIONS[rightIndex];
        if (left.owner !== right.owner) continue;
        assert.ok(
          Math.hypot(left.position.x - right.position.x, left.position.y - right.position.y) >= 80,
          `${left.name} and ${right.name} overlap`,
        );
      }
    }
    const first = createLiteScenario({ playerFaction: 'wu', mapSize: 33, routeDensity: 'dense', difficulty: 'hard' });
    const second = createLiteScenario({ playerFaction: 'wu', mapSize: 33, routeDensity: 'dense', difficulty: 'hard' });
    first.cities.jianye.troops = 99;
    assert.notEqual(second.cities.jianye.troops, 99);
  });
});
