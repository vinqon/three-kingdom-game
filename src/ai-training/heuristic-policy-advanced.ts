import { attack, endFactionTurn, legalTargets, transfer } from '../game/actions.ts';
import { FACTION_ORDER } from '../game/scenario.ts';
import type { CityState, FactionId, GameState } from '../game/types.ts';
import { baselinePolicy, enumerateLegalActions, type AiDecision, type Policy } from './policies.ts';

export interface ActionFeatureVector {
  cityGain: number;
  troopGain: number;
  ownCityRatio: number;
  ownTroopRatio: number;
  capitalControlProgress: number;
  winningMove: number;
  targetCapital: number;
  capturableTarget: number;
  ownCapitalThreat: number;
  ownCapitalSafety: number;
  enemyNearVictory: number;
  strongestEnemyCityRatio: number;
  strongestEnemyTroopRatio: number;
  targetOwnerNearVictory: number;
  distanceToEnemyCapital: number;
  frontlineReinforcement: number;
  frontlineTroopRatio: number;
  originExposure: number;
  capturedCityExposure: number;
  capturedCityRecaptureRisk: number;
  overkillPenalty: number;
  actionEfficiency: number;
}

export type HeuristicWeights = Record<keyof ActionFeatureVector, number>;

export const defaultHeuristicWeights: HeuristicWeights = {
  cityGain: 8,
  troopGain: 2,
  ownCityRatio: 3,
  ownTroopRatio: 2,
  capitalControlProgress: 24,
  winningMove: 80,
  targetCapital: 16,
  capturableTarget: 12,
  ownCapitalThreat: -22,
  ownCapitalSafety: 10,
  enemyNearVictory: -16,
  strongestEnemyCityRatio: -8,
  strongestEnemyTroopRatio: -6,
  targetOwnerNearVictory: 14,
  distanceToEnemyCapital: 4,
  frontlineReinforcement: 6,
  frontlineTroopRatio: 5,
  originExposure: -5,
  capturedCityExposure: -8,
  capturedCityRecaptureRisk: -18,
  overkillPenalty: -4,
  actionEfficiency: 4,
};

export const trainedHeuristicWeights: HeuristicWeights = {
  cityGain: 14.997617055661976,
  troopGain: 2.637179389409721,
  ownCityRatio: 9.124399782158434,
  ownTroopRatio: 5.99750023689121,
  capitalControlProgress: 24,
  winningMove: 121.1831135155633,
  targetCapital: 39.59948595892638,
  capturableTarget: 26.730566536821424,
  ownCapitalThreat: -39.00763115230948,
  ownCapitalSafety: 12,
  enemyNearVictory: -29.194038463942707,
  strongestEnemyCityRatio: -10,
  strongestEnemyTroopRatio: -8,
  targetOwnerNearVictory: 18,
  distanceToEnemyCapital: 7.803161346726119,
  frontlineReinforcement: 15.871471784450113,
  frontlineTroopRatio: 7,
  originExposure: -12.655970902182162,
  capturedCityExposure: -10,
  capturedCityRecaptureRisk: -18,
  overkillPenalty: -5,
  actionEfficiency: 7.308286056108773,
};

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function factionTotals(state: GameState, faction: FactionId): { cities: number; troops: number } {
  let cities = 0;
  let troops = 0;
  for (const city of Object.values(state.cities)) {
    if (city.owner !== faction) continue;
    cities += 1;
    troops += city.troops;
  }
  return { cities, troops };
}

function shouldRestWhenOutnumbered(state: GameState): boolean {
  const own = factionTotals(state, state.turnFaction);
  const strongestEnemyTroops = Math.max(
    ...FACTION_ORDER
      .filter((faction) => faction !== state.turnFaction)
      .map((faction) => factionTotals(state, faction).troops),
    0,
  );
  if (strongestEnemyTroops === 0) return false;
  const ownCapital = Object.values(state.cities).find(
    (city) => city.capitalOf === state.turnFaction && city.owner === state.turnFaction,
  );
  const capitalUnderImmediateThreat = ownCapital?.adjacentCityIds.some((id) => {
    const neighbor = state.cities[id];
    return neighbor.owner !== state.turnFaction && neighbor.troops >= ownCapital.troops;
  }) ?? false;
  return !capitalUnderImmediateThreat && own.troops < strongestEnemyTroops * 0.78;
}

function simulate(state: GameState, action: AiDecision): GameState {
  return action.mode === 'attack' ? attack(state, action).state : transfer(state, action).state;
}

function enemyCapitals(state: GameState, faction: FactionId): CityState[] {
  return Object.values(state.cities).filter(
    (city) => city.capitalOf && city.capitalOf !== faction && city.owner !== faction,
  );
}

function graphDistance(state: GameState, startId: string, targetIds: Set<string>): number {
  if (targetIds.size === 0) return 0;
  const seen = new Set([startId]);
  const queue: Array<{ cityId: string; distance: number }> = [{ cityId: startId, distance: 0 }];
  while (queue.length) {
    const current = queue.shift()!;
    if (targetIds.has(current.cityId)) return current.distance;
    for (const neighborId of state.cities[current.cityId].adjacentCityIds) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      queue.push({ cityId: neighborId, distance: current.distance + 1 });
    }
  }
  return Object.keys(state.cities).length;
}

function distancesFrom(state: GameState, targetId: string): Map<string, number> {
  const distances = new Map<string, number>([[targetId, 0]]);
  const queue = [targetId];
  while (queue.length) {
    const current = queue.shift()!;
    const distance = distances.get(current)!;
    for (const neighborId of state.cities[current].adjacentCityIds) {
      if (distances.has(neighborId)) continue;
      distances.set(neighborId, distance + 1);
      queue.push(neighborId);
    }
  }
  return distances;
}

function ownCapitalThreat(state: GameState, faction: FactionId): number {
  const capital = Object.values(state.cities).find(
    (city) => city.capitalOf === faction && city.owner === faction,
  );
  if (!capital) return 1;
  const danger = capital.adjacentCityIds.some((id) => {
    const neighbor = state.cities[id];
    return neighbor.owner !== faction && neighbor.troops >= capital.troops;
  });
  return danger ? 1 : 0;
}

function strongestEnemyVictoryProgress(state: GameState, faction: FactionId): number {
  return Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => Object.values(state.cities)
        .filter((city) => city.capitalOf && city.capitalOf !== enemy && city.owner === enemy).length / 2),
    0,
  );
}

function capitalSafety(state: GameState, faction: FactionId): number {
  const capital = Object.values(state.cities).find(
    (city) => city.capitalOf === faction && city.owner === faction,
  );
  if (!capital) return -1;
  const strongestAdjacentEnemy = Math.max(
    ...capital.adjacentCityIds
      .map((id) => state.cities[id])
      .filter((city) => city.owner !== faction)
      .map((city) => city.troops),
    0,
  );
  return clampUnit((capital.troops - strongestAdjacentEnemy) / Math.max(1, capital.troops + strongestAdjacentEnemy));
}

function frontlineTroopRatio(state: GameState, faction: FactionId): number {
  const owned = Object.values(state.cities).filter((city) => city.owner === faction);
  const ownTroops = owned.reduce((sum, city) => sum + city.troops, 0);
  const frontlineTroops = owned
    .filter((city) => city.adjacentCityIds.some((id) => state.cities[id].owner !== faction))
    .reduce((sum, city) => sum + city.troops, 0);
  return clampUnit(frontlineTroops / Math.max(1, ownTroops));
}

export function actionFeatures(state: GameState, action: AiDecision): ActionFeatureVector {
  const faction = state.turnFaction;
  const before = factionTotals(state, faction);
  const afterState = simulate(state, action);
  const after = factionTotals(afterState, faction);
  const totalCities = Object.keys(state.cities).length;
  const totalTroops = Object.values(state.cities).reduce((sum, city) => sum + city.troops, 0);
  const targetBefore = state.cities[action.targetCityId];
  const originAfter = afterState.cities[action.originCityId];
  const capitalTargets = new Set(enemyCapitals(afterState, faction).map((city) => city.id));
  const maxDistance = Math.max(1, totalCities - 1);
  const distance = graphDistance(afterState, action.targetCityId, capitalTargets);
  const targetIsFrontline = afterState.cities[action.targetCityId].adjacentCityIds
    .some((id) => afterState.cities[id].owner !== faction);
  const hostileNeighbors = originAfter.adjacentCityIds
    .filter((id) => afterState.cities[id].owner !== faction).length;
  const targetAfter = afterState.cities[action.targetCityId];
  const targetHostileNeighbors = targetAfter.adjacentCityIds
    .filter((id) => afterState.cities[id].owner !== faction).length;
  const strongestTargetHostileNeighbor = Math.max(
    ...targetAfter.adjacentCityIds
      .map((id) => afterState.cities[id])
      .filter((city) => city.owner !== faction)
      .map((city) => city.troops),
    0,
  );
  const targetOwner = targetBefore.owner;
  const victory = afterState.winner === faction ? 1 : 0;
  const captures = action.mode === 'attack' && action.troops > targetBefore.troops;
  const strongestEnemyCities = Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => factionTotals(afterState, enemy).cities),
    0,
  );
  const strongestEnemyTroops = Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => factionTotals(afterState, enemy).troops),
    0,
  );
  const overkill = captures
    ? Math.max(0, action.troops - targetBefore.troops - 1) / Math.max(1, action.troops)
    : 0;

  return {
    cityGain: clampUnit((after.cities - before.cities) / Math.max(1, totalCities)),
    troopGain: clampUnit((after.troops - before.troops) / Math.max(1, totalTroops)),
    ownCityRatio: clampUnit(after.cities / Math.max(1, totalCities)),
    ownTroopRatio: clampUnit(after.troops / Math.max(1, totalTroops)),
    capitalControlProgress: clampUnit(capitalProgress(afterState, faction) / 2),
    winningMove: victory,
    targetCapital: targetBefore.capitalOf && targetBefore.capitalOf !== faction ? 1 : 0,
    capturableTarget: captures ? 1 : action.mode === 'attack' ? -1 : 0,
    ownCapitalThreat: ownCapitalThreat(afterState, faction),
    ownCapitalSafety: capitalSafety(afterState, faction),
    enemyNearVictory: strongestEnemyVictoryProgress(afterState, faction),
    strongestEnemyCityRatio: clampUnit(strongestEnemyCities / Math.max(1, totalCities)),
    strongestEnemyTroopRatio: clampUnit(strongestEnemyTroops / Math.max(1, totalTroops)),
    targetOwnerNearVictory: targetOwner === faction ? 0 : clampUnit(capitalProgress(afterState, targetOwner) / 2),
    distanceToEnemyCapital: clampUnit(1 - distance / maxDistance),
    frontlineReinforcement: action.mode === 'transfer' && targetIsFrontline ? 1 : 0,
    frontlineTroopRatio: frontlineTroopRatio(afterState, faction),
    originExposure: clampUnit(hostileNeighbors / Math.max(1, originAfter.adjacentCityIds.length)),
    capturedCityExposure: captures
      ? clampUnit(targetHostileNeighbors / Math.max(1, targetAfter.adjacentCityIds.length))
      : 0,
    capturedCityRecaptureRisk: captures
      ? clampUnit(Math.max(0, strongestTargetHostileNeighbor - targetAfter.troops) /
        Math.max(1, strongestTargetHostileNeighbor + targetAfter.troops))
      : 0,
    overkillPenalty: clampUnit(overkill),
    actionEfficiency: clampUnit(action.mode === 'attack'
      ? action.troops / Math.max(1, targetBefore.troops + 1)
      : action.troops / Math.max(1, state.cities[action.originCityId].troops)),
  };
}

export function scoreAction(state: GameState, action: AiDecision, weights: HeuristicWeights): number {
  const features = actionFeatures(state, action);
  return Object.entries(features).reduce(
    (sum, [key, value]) => sum + (weights[key as keyof ActionFeatureVector] ?? 0) * value,
    0,
  );
}

function immediateWinningAttack(state: GameState): AiDecision | undefined {
  return enumerateLegalActions(state)
    .filter((action) => {
      if (action.mode !== 'attack') return false;
      const target = state.cities[action.targetCityId];
      return Boolean(target.capitalOf && target.capitalOf !== state.turnFaction);
    })
    .map((action) => ({ action, state: simulate(state, action) }))
    .filter((item) => item.state.winner === state.turnFaction)
    .sort((left, right) =>
      left.action.troops - right.action.troops ||
      left.action.targetCityId.localeCompare(right.action.targetCityId) ||
      left.action.originCityId.localeCompare(right.action.originCityId),
    )[0]?.action;
}

function capitalCaptureAttack(state: GameState): AiDecision | undefined {
  return compactCandidateActions(state)
    .filter((action) => {
      if (action.mode !== 'attack') return false;
      const target = state.cities[action.targetCityId];
      return Boolean(target.capitalOf && target.capitalOf !== state.turnFaction) &&
        action.troops > target.troops;
    })
    .sort((left, right) => {
      const leftAfter = simulate(state, left);
      const rightAfter = simulate(state, right);
      const leftProgress = capitalProgress(leftAfter, state.turnFaction);
      const rightProgress = capitalProgress(rightAfter, state.turnFaction);
      return rightProgress - leftProgress ||
        state.cities[left.targetCityId].troops - state.cities[right.targetCityId].troops ||
        right.troops - left.troops ||
        left.targetCityId.localeCompare(right.targetCityId) ||
        left.originCityId.localeCompare(right.originCityId);
    })[0];
}

function capitalCaptureSetupAction(state: GameState): AiDecision | undefined {
  if (state.actionsRemaining < 2) return undefined;
  return compactCandidateActions(state)
    .map((action) => {
      const after = simulate(state, action);
      return {
        action,
        followUp: capitalCaptureAttack(after),
      };
    })
    .filter((item): item is { action: AiDecision; followUp: AiDecision } => Boolean(item.followUp))
    .sort((left, right) => {
      const leftAfter = simulate(simulate(state, left.action), left.followUp);
      const rightAfter = simulate(simulate(state, right.action), right.followUp);
      return capitalProgress(rightAfter, state.turnFaction) - capitalProgress(leftAfter, state.turnFaction) ||
        Number(right.action.mode === 'attack') - Number(left.action.mode === 'attack') ||
        right.action.troops - left.action.troops ||
        left.followUp.targetCityId.localeCompare(right.followUp.targetCityId) ||
        left.action.targetCityId.localeCompare(right.action.targetCityId) ||
        left.action.originCityId.localeCompare(right.action.originCityId);
    })[0]?.action;
}

function reinforceThreatenedCapital(state: GameState): AiDecision | undefined {
  const capital = Object.values(state.cities).find(
    (city) => city.capitalOf === state.turnFaction && city.owner === state.turnFaction,
  );
  if (!capital) return undefined;
  const threatened = capital.adjacentCityIds.some((id) => {
    const city = state.cities[id];
    return city.owner !== state.turnFaction && city.troops >= capital.troops;
  });
  if (!threatened) return undefined;

  return legalTargets(state, capital.id, 'transfer')
    .filter((origin) => origin.troops > 1)
    .sort((left, right) => right.troops - left.troops || left.id.localeCompare(right.id))
    .map((origin) => ({
      mode: 'transfer' as const,
      originCityId: origin.id,
      targetCityId: capital.id,
      troops: origin.troops - 1,
    }))[0];
}

function capitalBridgeheadReinforcement(state: GameState): AiDecision | undefined {
  const enemyCapitalIds = new Set(enemyCapitals(state, state.turnFaction).map((city) => city.id));
  if (enemyCapitalIds.size === 0) return undefined;

  const plans = Object.values(state.cities)
    .filter((city) => city.owner === state.turnFaction)
    .flatMap((bridgehead) => bridgehead.adjacentCityIds
      .map((id) => state.cities[id])
      .filter((capital) => enemyCapitalIds.has(capital.id) && bridgehead.troops <= capital.troops)
      .map((capital) => ({ bridgehead, capital })))
    .map((plan) => {
      const origins = legalTargets(state, plan.bridgehead.id, 'transfer')
        .filter((origin) => {
          if (origin.id === plan.bridgehead.id || origin.troops < 2) return false;
          const originIsThreatenedCapital = origin.capitalOf === state.turnFaction &&
            origin.adjacentCityIds.some((id) => state.cities[id].owner !== state.turnFaction);
          return !originIsThreatenedCapital;
        })
        .sort((left, right) => right.troops - left.troops || left.id.localeCompare(right.id));
      return { ...plan, origin: origins[0] };
    })
    .filter((plan): plan is { bridgehead: CityState; capital: CityState; origin: CityState } =>
      Boolean(plan.origin),
    )
    .sort((left, right) =>
      capitalProgress(state, right.capital.owner) - capitalProgress(state, left.capital.owner) ||
      (left.capital.troops - left.bridgehead.troops) - (right.capital.troops - right.bridgehead.troops) ||
      right.origin.troops - left.origin.troops ||
      left.capital.id.localeCompare(right.capital.id) ||
      left.bridgehead.id.localeCompare(right.bridgehead.id) ||
      left.origin.id.localeCompare(right.origin.id),
    );

  const plan = plans[0];
  if (!plan) return undefined;
  return {
    mode: 'transfer',
    originCityId: plan.origin.id,
    targetCityId: plan.bridgehead.id,
    troops: plan.origin.troops - 1,
  };
}

function interruptEnemyVictoryProgress(state: GameState): AiDecision | undefined {
  const dangerousEnemies = FACTION_ORDER
    .filter((enemy) => enemy !== state.turnFaction)
    .map((enemy) => ({
      enemy,
      progress: capitalProgress(state, enemy),
      cities: factionTotals(state, enemy).cities,
      troops: factionTotals(state, enemy).troops,
    }))
    .filter((item) => item.progress > 0)
    .sort((left, right) =>
      right.progress - left.progress ||
      right.cities - left.cities ||
      right.troops - left.troops ||
      left.enemy.localeCompare(right.enemy),
    );

  for (const { enemy } of dangerousEnemies) {
    const recapture = compactCandidateActions(state)
      .filter((action) => {
        if (action.mode !== 'attack') return false;
        const target = state.cities[action.targetCityId];
        return target.owner === enemy &&
          Boolean(target.capitalOf && target.capitalOf !== enemy) &&
          action.troops > target.troops;
      })
      .sort((left, right) => {
        const leftTarget = state.cities[left.targetCityId];
        const rightTarget = state.cities[right.targetCityId];
        return leftTarget.troops - rightTarget.troops ||
          right.troops - left.troops ||
          left.targetCityId.localeCompare(right.targetCityId) ||
          left.originCityId.localeCompare(right.originCityId);
      })[0];
    if (recapture) return recapture;

    const threatenedCapitals = Object.values(state.cities)
      .filter((capital) => capital.capitalOf && capital.capitalOf !== enemy && capital.owner !== enemy)
      .flatMap((capital) => capital.adjacentCityIds
        .map((id) => state.cities[id])
        .filter((neighbor) => neighbor.owner === enemy && neighbor.troops >= capital.troops)
        .map((neighbor) => ({ capital, neighbor })))
      .sort((left, right) =>
        right.neighbor.troops - left.neighbor.troops ||
        left.capital.id.localeCompare(right.capital.id) ||
        left.neighbor.id.localeCompare(right.neighbor.id),
      );
    for (const threat of threatenedCapitals) {
      const counter = compactCandidateActions(state)
        .filter((action) => action.mode === 'attack' &&
          action.targetCityId === threat.neighbor.id &&
          action.troops > threat.neighbor.troops)
        .sort((left, right) =>
          right.troops - left.troops ||
          left.originCityId.localeCompare(right.originCityId),
        )[0];
      if (counter) return counter;
    }
  }

  return undefined;
}

function suppressStrongestEnemyAction(state: GameState): AiDecision | undefined {
  const own = factionTotals(state, state.turnFaction);
  const totalTroops = Object.values(state.cities).reduce((sum, city) => sum + city.troops, 0);
  const strongest = FACTION_ORDER
    .filter((enemy) => enemy !== state.turnFaction)
    .map((enemy) => ({
      enemy,
      ...factionTotals(state, enemy),
      progress: capitalProgress(state, enemy),
    }))
    .sort((left, right) =>
      right.progress - left.progress ||
      right.cities - left.cities ||
      right.troops - left.troops ||
      left.enemy.localeCompare(right.enemy),
    )[0];
  if (!strongest) return undefined;

  const enemyIsAhead = strongest.progress > 0 ||
    strongest.cities >= own.cities + 2 ||
    strongest.troops / Math.max(1, totalTroops) > own.troops / Math.max(1, totalTroops) + 0.12;
  if (!enemyIsAhead) return undefined;

  const capital = Object.values(state.cities).find(
    (city) => city.capitalOf === strongest.enemy && city.owner !== state.turnFaction,
  );
  if (!capital) return undefined;
  const distances = distancesFrom(state, capital.id);
  const actions = compactCandidateActions(state);

  const attacks = actions
    .filter((action) => {
      if (action.mode !== 'attack') return false;
      const target = state.cities[action.targetCityId];
      const originDistance = distances.get(action.originCityId) ?? Number.POSITIVE_INFINITY;
      const targetDistance = distances.get(action.targetCityId) ?? Number.POSITIVE_INFINITY;
      return target.owner === strongest.enemy &&
        action.troops > target.troops &&
        targetDistance <= originDistance;
    })
    .sort((left, right) => {
      const leftTarget = state.cities[left.targetCityId];
      const rightTarget = state.cities[right.targetCityId];
      return Number(rightTarget.id === capital.id) - Number(leftTarget.id === capital.id) ||
        (distances.get(left.targetCityId) ?? 99) - (distances.get(right.targetCityId) ?? 99) ||
        leftTarget.troops - rightTarget.troops ||
        right.troops - left.troops ||
        left.targetCityId.localeCompare(right.targetCityId) ||
        left.originCityId.localeCompare(right.originCityId);
    });
  if (attacks[0]) return attacks[0];

  const transfers = actions
    .filter((action) => {
      if (action.mode !== 'transfer') return false;
      const originDistance = distances.get(action.originCityId) ?? Number.POSITIVE_INFINITY;
      const targetDistance = distances.get(action.targetCityId) ?? Number.POSITIVE_INFINITY;
      const target = state.cities[action.targetCityId];
      return targetDistance < originDistance &&
        target.adjacentCityIds.some((id) => state.cities[id].owner === strongest.enemy);
    })
    .sort((left, right) =>
      (distances.get(left.targetCityId) ?? 99) - (distances.get(right.targetCityId) ?? 99) ||
      right.troops - left.troops ||
      left.targetCityId.localeCompare(right.targetCityId) ||
      left.originCityId.localeCompare(right.originCityId),
    );
  return transfers[0];
}

function compactCandidateActions(state: GameState): AiDecision[] {
  if (state.status !== 'playing' || state.actionsRemaining < 1) return [];
  const actions: AiDecision[] = [];
  const seen = new Set<string>();
  const add = (action: AiDecision): void => {
    const key = `${action.mode}:${action.originCityId}:${action.targetCityId}:${action.troops}`;
    if (seen.has(key)) return;
    seen.add(key);
    actions.push(action);
  };

  for (const origin of Object.values(state.cities)
    .filter((city) => city.owner === state.turnFaction && city.troops > 1)
    .sort((left, right) => left.id.localeCompare(right.id))) {
    const maxTroops = origin.troops - 1;
    for (const target of legalTargets(state, origin.id, 'attack')) {
      if (maxTroops > target.troops) {
        add({
          mode: 'attack',
          originCityId: origin.id,
          targetCityId: target.id,
          troops: target.troops + 1,
        });
        add({
          mode: 'attack',
          originCityId: origin.id,
          targetCityId: target.id,
          troops: maxTroops,
        });
      } else if (target.capitalOf && target.capitalOf !== state.turnFaction) {
        add({
          mode: 'attack',
          originCityId: origin.id,
          targetCityId: target.id,
          troops: maxTroops,
        });
      }
    }
    for (const target of legalTargets(state, origin.id, 'transfer')) {
      add({
        mode: 'transfer',
        originCityId: origin.id,
        targetCityId: target.id,
        troops: maxTroops,
      });
    }
  }

  return actions;
}

function strategicPathAction(state: GameState): AiDecision | undefined {
  const capitals = enemyCapitals(state, state.turnFaction)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (capitals.length === 0) return undefined;

  const targetPlans = capitals
    .map((capital) => {
      const distances = distancesFrom(state, capital.id);
      const closestOwnedDistance = Math.min(
        ...Object.values(state.cities)
          .filter((city) => city.owner === state.turnFaction)
          .map((city) => distances.get(city.id) ?? Number.POSITIVE_INFINITY),
      );
      const enemyFaction = capital.capitalOf!;
      const enemyCities = Object.values(state.cities)
        .filter((city) => city.owner === enemyFaction).length;
      const enemyTroops = Object.values(state.cities)
        .filter((city) => city.owner === enemyFaction)
        .reduce((sum, city) => sum + city.troops, 0);
      const enemyCapitalProgress = Object.values(state.cities)
        .filter((city) => city.capitalOf && city.capitalOf !== enemyFaction && city.owner === enemyFaction)
        .length;
      return { capital, distances, closestOwnedDistance, enemyCities, enemyTroops, enemyCapitalProgress };
    })
    .sort((left, right) =>
      right.enemyCapitalProgress - left.enemyCapitalProgress ||
      right.enemyCities - left.enemyCities ||
      right.enemyTroops - left.enemyTroops ||
      left.closestOwnedDistance - right.closestOwnedDistance ||
      left.capital.troops - right.capital.troops ||
      left.capital.id.localeCompare(right.capital.id),
    );

  for (const plan of targetPlans) {
    const attacks = compactCandidateActions(state)
      .filter((action) => {
        if (action.mode !== 'attack') return false;
        const originDistance = plan.distances.get(action.originCityId) ?? Number.POSITIVE_INFINITY;
        const targetDistance = plan.distances.get(action.targetCityId) ?? Number.POSITIVE_INFINITY;
        const target = state.cities[action.targetCityId];
        return targetDistance < originDistance && action.troops > target.troops;
      })
      .sort((left, right) => {
        const leftTarget = state.cities[left.targetCityId];
        const rightTarget = state.cities[right.targetCityId];
        return Number(Boolean(rightTarget.capitalOf)) - Number(Boolean(leftTarget.capitalOf)) ||
          (plan.distances.get(left.targetCityId) ?? 99) - (plan.distances.get(right.targetCityId) ?? 99) ||
          right.troops - left.troops ||
          left.targetCityId.localeCompare(right.targetCityId) ||
          left.originCityId.localeCompare(right.originCityId);
      });
    if (attacks[0]) return attacks[0];

    const transfers = compactCandidateActions(state)
      .filter((action) => {
        if (action.mode !== 'transfer') return false;
        const origin = state.cities[action.originCityId];
        const target = state.cities[action.targetCityId];
        const originDistance = plan.distances.get(origin.id) ?? Number.POSITIVE_INFINITY;
        const targetDistance = plan.distances.get(target.id) ?? Number.POSITIVE_INFINITY;
        if (targetDistance >= originDistance) return false;
        const originIsThreatenedCapital = origin.capitalOf === state.turnFaction &&
          origin.adjacentCityIds.some((id) => state.cities[id].owner !== state.turnFaction);
        return !originIsThreatenedCapital;
      })
      .sort((left, right) =>
        (plan.distances.get(left.targetCityId) ?? 99) - (plan.distances.get(right.targetCityId) ?? 99) ||
        right.troops - left.troops ||
        left.targetCityId.localeCompare(right.targetCityId) ||
        left.originCityId.localeCompare(right.originCityId),
      );
    if (transfers[0]) return transfers[0];
  }

  return undefined;
}

function focusedStrategicPathAction(state: GameState): AiDecision | undefined {
  const capitals = enemyCapitals(state, state.turnFaction)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (capitals.length === 0) return undefined;

  const plans = capitals
    .map((capital) => {
      const distances = distancesFrom(state, capital.id);
      const enemyFaction = capital.capitalOf!;
      const capturedEnemyHomeland = Object.values(state.cities)
        .filter((city) => city.originalOwner === enemyFaction && city.owner === state.turnFaction).length;
      const adjacentFootholds = capital.adjacentCityIds
        .map((id) => state.cities[id])
        .filter((city) => city.owner === state.turnFaction).length;
      const closestOwnedDistance = Math.min(
        ...Object.values(state.cities)
          .filter((city) => city.owner === state.turnFaction)
          .map((city) => distances.get(city.id) ?? Number.POSITIVE_INFINITY),
      );
      const enemyCities = Object.values(state.cities)
        .filter((city) => city.owner === enemyFaction).length;
      const enemyTroops = Object.values(state.cities)
        .filter((city) => city.owner === enemyFaction)
        .reduce((sum, city) => sum + city.troops, 0);
      return { capital, distances, capturedEnemyHomeland, adjacentFootholds, closestOwnedDistance, enemyCities, enemyTroops };
    })
    .sort((left, right) =>
      right.adjacentFootholds - left.adjacentFootholds ||
      right.capturedEnemyHomeland - left.capturedEnemyHomeland ||
      right.enemyCities - left.enemyCities ||
      right.enemyTroops - left.enemyTroops ||
      left.closestOwnedDistance - right.closestOwnedDistance ||
      left.capital.troops - right.capital.troops ||
      left.capital.id.localeCompare(right.capital.id),
    );

  for (const plan of plans) {
    const attacks = compactCandidateActions(state)
      .filter((action) => {
        if (action.mode !== 'attack') return false;
        const originDistance = plan.distances.get(action.originCityId) ?? Number.POSITIVE_INFINITY;
        const targetDistance = plan.distances.get(action.targetCityId) ?? Number.POSITIVE_INFINITY;
        const target = state.cities[action.targetCityId];
        return targetDistance < originDistance && action.troops > target.troops;
      })
      .sort((left, right) => {
        const leftTarget = state.cities[left.targetCityId];
        const rightTarget = state.cities[right.targetCityId];
        return Number(rightTarget.id === plan.capital.id) - Number(leftTarget.id === plan.capital.id) ||
          (plan.distances.get(left.targetCityId) ?? 99) - (plan.distances.get(right.targetCityId) ?? 99) ||
          Number(rightTarget.originalOwner === plan.capital.capitalOf) -
            Number(leftTarget.originalOwner === plan.capital.capitalOf) ||
          right.troops - left.troops ||
          left.targetCityId.localeCompare(right.targetCityId) ||
          left.originCityId.localeCompare(right.originCityId);
      });
    if (attacks[0]) return attacks[0];

    const transfers = compactCandidateActions(state)
      .filter((action) => {
        if (action.mode !== 'transfer') return false;
        const origin = state.cities[action.originCityId];
        const target = state.cities[action.targetCityId];
        const originDistance = plan.distances.get(origin.id) ?? Number.POSITIVE_INFINITY;
        const targetDistance = plan.distances.get(target.id) ?? Number.POSITIVE_INFINITY;
        if (targetDistance >= originDistance) return false;
        const originIsThreatenedCapital = origin.capitalOf === state.turnFaction &&
          origin.adjacentCityIds.some((id) => state.cities[id].owner !== state.turnFaction);
        return !originIsThreatenedCapital;
      })
      .sort((left, right) =>
        (plan.distances.get(left.targetCityId) ?? 99) - (plan.distances.get(right.targetCityId) ?? 99) ||
        Number(state.cities[right.targetCityId].originalOwner === plan.capital.capitalOf) -
          Number(state.cities[left.targetCityId].originalOwner === plan.capital.capitalOf) ||
        right.troops - left.troops ||
        left.targetCityId.localeCompare(right.targetCityId) ||
        left.originCityId.localeCompare(right.originCityId),
      );
    if (transfers[0]) return transfers[0];
  }

  return undefined;
}

function fallbackAction(state: GameState): AiDecision | undefined {
  return immediateWinningAttack(state) ?? reinforceThreatenedCapital(state) ?? strategicPathAction(state);
}

function capitalProgress(state: GameState, faction: FactionId): number {
  return Object.values(state.cities)
    .filter((city) => city.capitalOf && city.capitalOf !== faction && city.owner === faction)
    .length;
}

function evaluateRolloutState(state: GameState, faction: FactionId): number {
  if (state.winner === faction) return 100_000;
  if (state.status !== 'playing') return -100_000;

  const own = factionTotals(state, faction);
  const totalCities = Object.keys(state.cities).length;
  const totalTroops = Object.values(state.cities).reduce((sum, city) => sum + city.troops, 0);
  const ownCapital = Object.values(state.cities).find((city) => city.capitalOf === faction);
  const ownCapitalHeld = ownCapital?.owner === faction ? 1 : 0;
  const strongestEnemyProgress = Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => capitalProgress(state, enemy)),
    0,
  );
  const strongestEnemyCities = Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => factionTotals(state, enemy).cities),
    0,
  );

  return capitalProgress(state, faction) * 20_000 +
    ownCapitalHeld * 3_000 +
    own.cities / totalCities * 1_000 +
    own.troops / Math.max(1, totalTroops) * 700 -
    strongestEnemyProgress * 8_000 -
    strongestEnemyCities / totalCities * 600;
}

function evaluateWeightedRolloutState(
  state: GameState,
  faction: FactionId,
  weights: HeuristicWeights,
): number {
  if (state.winner === faction) return 100_000 + weights.winningMove * 100;
  if (state.status !== 'playing') return -100_000;

  const own = factionTotals(state, faction);
  const totalCities = Object.keys(state.cities).length;
  const totalTroops = Object.values(state.cities).reduce((sum, city) => sum + city.troops, 0);
  const ownCapital = Object.values(state.cities).find((city) => city.capitalOf === faction);
  const ownCapitalHeld = ownCapital?.owner === faction ? 1 : -1;
  const strongestEnemyProgress = Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => capitalProgress(state, enemy)),
    0,
  );
  const strongestEnemyCities = Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => factionTotals(state, enemy).cities),
    0,
  );
  const strongestEnemyTroops = Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => factionTotals(state, enemy).troops),
    0,
  );

  const enemyCapitalDanger = Math.max(
    ...FACTION_ORDER
      .filter((enemy) => enemy !== faction)
      .map((enemy) => {
        if (capitalProgress(state, enemy) > 0) return capitalProgress(state, enemy) * 2;
        return Object.values(state.cities)
          .filter((city) => city.capitalOf && city.capitalOf !== enemy && city.owner !== enemy)
          .some((capital) => capital.adjacentCityIds.some((id) => {
            const neighbor = state.cities[id];
            return neighbor.owner === enemy && neighbor.troops > capital.troops;
          })) ? 1 : 0;
      }),
    0,
  );

  return capitalProgress(state, faction) * weights.targetCapital * 700 +
    capitalProgress(state, faction) / 2 * (weights.capitalControlProgress ?? 0) * 800 +
    ownCapitalHeld * Math.abs(weights.ownCapitalThreat) * 100 +
    capitalSafety(state, faction) * (weights.ownCapitalSafety ?? 0) * 120 +
    own.cities / Math.max(1, totalCities) * weights.ownCityRatio * 120 +
    own.troops / Math.max(1, totalTroops) * weights.ownTroopRatio * 120 +
    frontlineTroopRatio(state, faction) * (weights.frontlineTroopRatio ?? 0) * 80 +
    (own.troops - strongestEnemyTroops) / Math.max(1, totalTroops) * weights.troopGain * 80 -
    strongestEnemyProgress * Math.abs(weights.enemyNearVictory) * 900 -
    enemyCapitalDanger * Math.abs(weights.enemyNearVictory) * 700 -
    strongestEnemyCities / Math.max(1, totalCities) * Math.abs(weights.enemyNearVictory) * 60 +
    strongestEnemyCities / Math.max(1, totalCities) * (weights.strongestEnemyCityRatio ?? 0) * 100 +
    strongestEnemyTroops / Math.max(1, totalTroops) * (weights.strongestEnemyTroopRatio ?? 0) * 100;
}

function decisionCacheKey(state: GameState): string {
  return [
    state.round,
    state.turnFaction,
    state.actionsRemaining,
    state.status,
    ...Object.values(state.cities)
      .sort((left, right) => left.id.localeCompare(right.id))
      .flatMap((city) => [city.id, city.owner, city.troops]),
  ].join('|');
}

function playDecision(state: GameState, decision: AiDecision | undefined): GameState {
  if (!decision) {
    const next = structuredClone(state);
    next.actionsRemaining = 0;
    return next;
  }
  return simulate(state, decision);
}

function rolloutToNextOwnTurn(
  state: GameState,
  faction: FactionId,
  opponentPolicy: Policy = baselinePolicy,
): GameState {
  let next = state;
  let guard = 0;

  while (next.status === 'playing' && next.actionsRemaining > 0 && guard < 2) {
    const decision = fallbackAction(next);
    if (!decision) break;
    next = playDecision(next, decision);
    guard += 1;
  }
  if (next.status !== 'playing') return next;
  next.actionsRemaining = 0;
  next = endFactionTurn(next);

  let factionGuard = 0;
  while (next.status === 'playing' && next.turnFaction !== faction && factionGuard < FACTION_ORDER.length) {
    let actionGuard = 0;
    while (next.status === 'playing' && next.actionsRemaining > 0 && actionGuard < 2) {
      const decision = opponentPolicy.chooseAction(next);
      if (!decision) break;
      next = playDecision(next, decision);
      actionGuard += 1;
    }
    if (next.status !== 'playing') break;
    next.actionsRemaining = 0;
    next = endFactionTurn(next);
    factionGuard += 1;
  }

  return next;
}

function rolloutAction(
  state: GameState,
  weights?: HeuristicWeights,
  opponentPolicy: Policy = baselinePolicy,
): AiDecision | undefined {
  const faction = state.turnFaction;
  const rawCandidates = compactCandidateActions(state);
  const rankedCandidates = weights
    ? rawCandidates
      .map((action) => ({ action, score: scoreAction(state, action, weights) }))
      .sort((left, right) =>
        right.score - left.score ||
        Number(right.action.mode === 'attack') - Number(left.action.mode === 'attack') ||
        right.action.troops - left.action.troops ||
        left.action.targetCityId.localeCompare(right.action.targetCityId) ||
        left.action.originCityId.localeCompare(right.action.originCityId),
      )
      .slice(0, 2)
      .map((item) => item.action)
    : rawCandidates;
  const strategic = strategicPathAction(state);
  const candidates: Array<AiDecision | undefined> = [];
  const seen = new Set<string>();
  const add = (action: AiDecision | undefined): void => {
    if (!action) {
      candidates.push(undefined);
      return;
    }
    const key = `${action.mode}:${action.originCityId}:${action.targetCityId}:${action.troops}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(action);
  };
  for (const action of rankedCandidates) add(action);
  add(strategic);
  if (weights) add(focusedStrategicPathAction(state));
  if (weights) add(suppressStrongestEnemyAction(state));
  add(undefined);
  return candidates
    .map((action) => {
      const afterAction = playDecision(state, action);
      const afterRollout = rolloutToNextOwnTurn(afterAction, faction, opponentPolicy);
      return {
        action,
        score: weights
          ? evaluateWeightedRolloutState(afterRollout, faction, weights)
          : evaluateRolloutState(afterRollout, faction),
      };
    })
    .sort((left, right) => {
      const leftAction = left.action;
      const rightAction = right.action;
      return right.score - left.score ||
        Number(Boolean(rightAction)) - Number(Boolean(leftAction)) ||
        (rightAction?.troops ?? 0) - (leftAction?.troops ?? 0) ||
        (leftAction?.targetCityId ?? '').localeCompare(rightAction?.targetCityId ?? '') ||
        (leftAction?.originCityId ?? '').localeCompare(rightAction?.originCityId ?? '');
    })[0]?.action;
}

export function createHeuristicPolicy(weights: HeuristicWeights): Policy {
  const cache = new Map<string, AiDecision | null>();
  return {
    name: 'heuristic',
    chooseAction(state) {
      const key = decisionCacheKey(state);
      if (cache.has(key)) return cache.get(key) ?? undefined;
      const immediate = immediateWinningAttack(state) ?? reinforceThreatenedCapital(state);
      if (immediate) {
        cache.set(key, immediate);
        return immediate;
      }
      const rollout = rolloutAction(state);
      if (rollout || shouldRestWhenOutnumbered(state)) {
        cache.set(key, rollout ?? null);
        return rollout;
      }
      const urgent = strategicPathAction(state);
      if (urgent) {
        cache.set(key, urgent);
        return urgent;
      }
      const selected = compactCandidateActions(state)
        .map((action) => ({ action, score: scoreAction(state, action, weights) }))
        .sort((left, right) =>
          right.score - left.score ||
          Number(right.action.mode === 'attack') - Number(left.action.mode === 'attack') ||
          right.action.troops - left.action.troops ||
          left.action.targetCityId.localeCompare(right.action.targetCityId) ||
          left.action.originCityId.localeCompare(right.action.originCityId),
        )[0]?.action;
      cache.set(key, selected ?? null);
      return selected;
    },
  };
}

export function createV2Policy(
  weights: HeuristicWeights,
  rolloutOpponent: Policy = baselinePolicy,
  options: { useRollout?: boolean } = {},
): Policy {
  const useRollout = options.useRollout ?? true;
  const cache = new Map<string, AiDecision | null>();
  return {
    name: 'heuristic-v2',
    chooseAction(state) {
      const key = decisionCacheKey(state);
      if (cache.has(key)) return cache.get(key) ?? undefined;
      const immediate = immediateWinningAttack(state) ??
        capitalCaptureAttack(state) ??
        capitalCaptureSetupAction(state) ??
        reinforceThreatenedCapital(state) ??
        interruptEnemyVictoryProgress(state) ??
        capitalBridgeheadReinforcement(state);
      if (immediate) {
        cache.set(key, immediate);
        return immediate;
      }
      if (useRollout) {
        const rollout = rolloutAction(state, weights, rolloutOpponent);
        if (rollout) {
          cache.set(key, rollout);
          return rollout;
        }
      }
      const urgent = strategicPathAction(state);
      if (urgent) {
        cache.set(key, urgent);
        return urgent;
      }
      const selected = compactCandidateActions(state)
        .map((action) => ({ action, score: scoreAction(state, action, weights) }))
        .sort((left, right) =>
          right.score - left.score ||
          Number(right.action.mode === 'attack') - Number(left.action.mode === 'attack') ||
          right.action.troops - left.action.troops ||
          left.action.targetCityId.localeCompare(right.action.targetCityId) ||
          left.action.originCityId.localeCompare(right.action.originCityId),
        )[0]?.action;
      cache.set(key, selected ?? null);
      return selected;
    },
  };
}
