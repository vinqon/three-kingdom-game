import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { beginFactionTurn } from './actions.ts';
import { CITY_DEFINITIONS, createLiteScenario, routesForScenario } from './scenario.ts';

const FACTIONS = ['wei', 'shu', 'wu'] as const;
const MAP_SIZES = [12, 21, 33] as const;
const MIN_CITY_CENTER_DISTANCE = 60;
const MIN_ROUTE_MARKER_CLEARANCE = 43;
const MIN_PARALLEL_ROUTE_GAP = 10;
const MAX_ROUTE_LENGTH = 310;
const MAX_BORDER_ROUTES = {
  12: 3,
  21: 4,
  33: 5,
} as const;

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

function nearlyParallelRoutes(
  firstStart: { x: number; y: number },
  firstEnd: { x: number; y: number },
  secondStart: { x: number; y: number },
  secondEnd: { x: number; y: number },
): boolean {
  const firstX = firstEnd.x - firstStart.x;
  const firstY = firstEnd.y - firstStart.y;
  const secondX = secondEnd.x - secondStart.x;
  const secondY = secondEnd.y - secondStart.y;
  const firstLength = Math.hypot(firstX, firstY);
  const secondLength = Math.hypot(secondX, secondY);
  const cross = Math.abs(firstX * secondY - firstY * secondX);
  return cross / (firstLength * secondLength) < 0.18;
}

function routeProjection(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  return ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / (deltaX ** 2 + deltaY ** 2);
}

function routeInteriorOverlap(
  firstStart: { x: number; y: number },
  firstEnd: { x: number; y: number },
  secondStart: { x: number; y: number },
  secondEnd: { x: number; y: number },
): boolean {
  const projections = [
    routeProjection(secondStart, firstStart, firstEnd),
    routeProjection(secondEnd, firstStart, firstEnd),
  ].sort((left, right) => left - right);
  return Math.max(projections[0], 0.1) < Math.min(projections[1], 0.9);
}

function routesCross(
  firstStart: { x: number; y: number },
  firstEnd: { x: number; y: number },
  secondStart: { x: number; y: number },
  secondEnd: { x: number; y: number },
): boolean {
  const orientation = (
    left: { x: number; y: number },
    middle: { x: number; y: number },
    right: { x: number; y: number },
  ) => Math.sign((middle.y - left.y) * (right.x - middle.x) - (middle.x - left.x) * (right.y - middle.y));
  return orientation(firstStart, firstEnd, secondStart) !== orientation(firstStart, firstEnd, secondEnd)
    && orientation(secondStart, secondEnd, firstStart) !== orientation(secondStart, secondEnd, firstEnd);
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
    assert.ok(state.cities.wan.adjacentCityIds.includes('hanzhong'));
    assert.ok(Object.values(state.cities).every((city) => city.adjacentCityIds.length >= 1));
  });

  it('builds one grouped route plan with connected domestic clusters and limited border gateways', () => {
    for (const mapSize of MAP_SIZES) {
      const routes = routesForScenario(mapSize, 'standard');
      const state = createLiteScenario({
        playerFaction: 'wei',
        mapSize,
        routeDensity: 'standard',
        difficulty: 'easy',
      });

      const keys = routes.map(([left, right]) => [left, right].sort().join('~'));
      assert.equal(new Set(keys).size, routes.length);

      let borderRouteCount = 0;
      for (const [left, right] of routes) {
        assert.ok(state.cities[left]);
        assert.ok(state.cities[right]);
        assert.ok(state.cities[left].adjacentCityIds.includes(right));
        assert.ok(state.cities[right].adjacentCityIds.includes(left));
        assert.equal(Boolean(state.cities[left].capitalOf && state.cities[right].capitalOf), false);
        if (state.cities[left].originalOwner !== state.cities[right].originalOwner) borderRouteCount += 1;
      }
      assert.ok(borderRouteCount <= MAX_BORDER_ROUTES[mapSize], `${mapSize}: ${borderRouteCount} border routes`);

      for (const city of Object.values(state.cities)) {
        assert.ok(city.adjacentCityIds.length >= 1, `${mapSize}: ${city.name} has no routes`);
      }

      for (const faction of FACTIONS) {
        const factionCityIds = Object.values(state.cities)
          .filter((city) => city.originalOwner === faction)
          .map((city) => city.id);
        const seen = new Set([factionCityIds[0]]);
        const queue = [factionCityIds[0]];
        while (queue.length) {
          const current = queue.shift()!;
          for (const neighbor of state.cities[current].adjacentCityIds) {
            if (!factionCityIds.includes(neighbor) || seen.has(neighbor)) continue;
            seen.add(neighbor);
            queue.push(neighbor);
          }
        }
        assert.equal(seen.size, factionCityIds.length, `${mapSize}: ${faction} domestic cluster is split`);
      }

      const firstId = Object.keys(state.cities)[0];
      const seen = new Set([firstId]);
      const queue = [firstId];
      while (queue.length) {
        const current = queue.shift()!;
        for (const neighbor of state.cities[current].adjacentCityIds) {
          if (seen.has(neighbor)) continue;
          seen.add(neighbor);
          queue.push(neighbor);
        }
      }
      assert.equal(seen.size, mapSize);
    }
  });

  it('keeps every static route clear of third-city markers', () => {
    for (const mapSize of MAP_SIZES) {
      const state = createLiteScenario({
        playerFaction: 'wei',
        mapSize,
        routeDensity: 'standard',
        difficulty: 'easy',
      });

      for (const [leftId, rightId] of routesForScenario(mapSize, 'standard')) {
        const left = state.cities[leftId];
        const right = state.cities[rightId];
        const routeLength = Math.hypot(
          left.position.x - right.position.x,
          left.position.y - right.position.y,
        );
        assert.ok(
          routeLength <= MAX_ROUTE_LENGTH,
          `${mapSize}: ${left.name}—${right.name} is too long at ${routeLength.toFixed(1)}`,
        );
        for (const city of Object.values(state.cities)) {
          if (city.id === leftId || city.id === rightId) continue;
          const clearance = routeClearance(city.position, left.position, right.position);
          const blocksRoute = clearance.projection > 0.08
            && clearance.projection < 0.92
            && clearance.distance < MIN_ROUTE_MARKER_CLEARANCE;
          assert.equal(
            blocksRoute,
            false,
            `${mapSize}: ${left.name}—${right.name} is ${clearance.distance.toFixed(1)} from ${city.name}`,
          );
        }
      }
    }
  });

  it('keeps active city markers and nearly parallel route lanes visually separated', () => {
    for (const mapSize of MAP_SIZES) {
      const state = createLiteScenario({
        playerFaction: 'wei',
        mapSize,
        routeDensity: 'standard',
        difficulty: 'easy',
      });
      const cities = Object.values(state.cities);

      for (let leftIndex = 0; leftIndex < cities.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < cities.length; rightIndex += 1) {
          const left = cities[leftIndex];
          const right = cities[rightIndex];
          const distance = Math.hypot(
            left.position.x - right.position.x,
            left.position.y - right.position.y,
          );
          assert.ok(
            distance >= MIN_CITY_CENTER_DISTANCE,
            `${mapSize}: ${left.name} and ${right.name} are only ${distance.toFixed(1)} apart`,
          );
        }
      }

      const routes = routesForScenario(mapSize, 'standard');
      let crossingCount = 0;
      for (let firstIndex = 0; firstIndex < routes.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < routes.length; secondIndex += 1) {
          const [firstLeftId, firstRightId] = routes[firstIndex];
          const [secondLeftId, secondRightId] = routes[secondIndex];
          if ([firstLeftId, firstRightId].includes(secondLeftId)
            || [firstLeftId, firstRightId].includes(secondRightId)) {
            continue;
          }

          const firstLeft = state.cities[firstLeftId];
          const firstRight = state.cities[firstRightId];
          const secondLeft = state.cities[secondLeftId];
          const secondRight = state.cities[secondRightId];
          if (routesCross(
            firstLeft.position,
            firstRight.position,
            secondLeft.position,
            secondRight.position,
          )) {
            crossingCount += 1;
          }
          if (!nearlyParallelRoutes(
            firstLeft.position,
            firstRight.position,
            secondLeft.position,
            secondRight.position,
          ) || !routeInteriorOverlap(
            firstLeft.position,
            firstRight.position,
            secondLeft.position,
            secondRight.position,
          )) {
            continue;
          }

          const clearance = Math.min(
            routeClearance(secondLeft.position, firstLeft.position, firstRight.position).distance,
            routeClearance(secondRight.position, firstLeft.position, firstRight.position).distance,
          );
          assert.ok(
            clearance >= MIN_PARALLEL_ROUTE_GAP,
            `${mapSize}: ${firstLeft.name}—${firstRight.name} and ${secondLeft.name}—${secondRight.name} are only ${clearance.toFixed(1)} apart`,
          );
        }
      }
      assert.ok(crossingCount <= 1, `${mapSize}: ${crossingCount} route crossings is too many`);
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
        assert.ok(Math.hypot(left.position.x - right.position.x, left.position.y - right.position.y) >= MIN_CITY_CENTER_DISTANCE);
      }
    }
    const first = createLiteScenario({ playerFaction: 'wu', mapSize: 33, routeDensity: 'dense', difficulty: 'hard' });
    const second = createLiteScenario({ playerFaction: 'wu', mapSize: 33, routeDensity: 'dense', difficulty: 'hard' });
    first.cities.jianye.troops = 99;
    assert.notEqual(second.cities.jianye.troops, 99);
  });
});
