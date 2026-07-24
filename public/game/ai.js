import { attack, legalTargets, transfer } from './actions.js';
import { createHeuristicPolicy, trainedHeuristicWeights } from './heuristic-policy.js';
function winningAttacks(state) {
    const candidates = [];
    for (const origin of Object.values(state.cities)){
        if (origin.owner !== state.turnFaction || origin.troops < 2) continue;
        const troops = origin.troops - 1;
        for (const target of legalTargets(state, origin.id, 'attack')){
            if (troops > target.troops) {
                candidates.push({
                    mode: 'attack',
                    originCityId: origin.id,
                    targetCityId: target.id,
                    troops
                });
            }
        }
    }
    return candidates;
}
function attackScore(state, decision) {
    const target = state.cities[decision.targetCityId];
    const remainingEnemyCapitals = Object.values(state.cities).filter((city)=>city.capitalOf && city.capitalOf !== state.turnFaction && city.owner !== state.turnFaction);
    const completesVictory = target.capitalOf && remainingEnemyCapitals.length === 1;
    return (completesVictory ? 10_000 : 0) + (target.capitalOf ? 1_000 : 0) - target.troops * 10;
}
function threatenedCapitalTransfer(state) {
    const capital = Object.values(state.cities).find((city)=>city.capitalOf === state.turnFaction && city.owner === state.turnFaction);
    if (!capital) return undefined;
    const threatened = capital.adjacentCityIds.some((id)=>{
        const city = state.cities[id];
        return city.owner !== state.turnFaction && city.troops >= capital.troops;
    });
    if (!threatened) return undefined;
    return legalTargets(state, capital.id, 'transfer').filter((city)=>city.troops > 1).sort((left, right)=>right.troops - left.troops || left.id.localeCompare(right.id)).map((origin)=>({
            mode: 'transfer',
            originCityId: origin.id,
            targetCityId: capital.id,
            troops: origin.troops - 1
        }))[0];
}
function frontlineTransfer(state) {
    const isFrontline = (cityId)=>state.cities[cityId].adjacentCityIds.some((neighborId)=>state.cities[neighborId].owner !== state.turnFaction);
    const enemyCapitals = Object.values(state.cities).filter((city)=>city.capitalOf !== undefined && city.capitalOf !== state.turnFaction && city.owner !== state.turnFaction).map((city)=>city.id);
    function distanceToEnemyCapital(startId) {
        if (enemyCapitals.length === 0) return Number.POSITIVE_INFINITY;
        const destinations = new Set(enemyCapitals);
        const seen = new Set([
            startId
        ]);
        const queue = [
            {
                cityId: startId,
                distance: 0
            }
        ];
        while(queue.length){
            const current = queue.shift();
            if (destinations.has(current.cityId)) return current.distance;
            for (const neighborId of state.cities[current.cityId].adjacentCityIds){
                if (seen.has(neighborId)) continue;
                seen.add(neighborId);
                queue.push({
                    cityId: neighborId,
                    distance: current.distance + 1
                });
            }
        }
        return Number.POSITIVE_INFINITY;
    }
    const candidates = [];
    for (const origin of Object.values(state.cities)){
        if (origin.owner !== state.turnFaction || origin.troops < 3) continue;
        for (const target of legalTargets(state, origin.id, 'transfer')){
            if (!isFrontline(target.id)) continue;
            candidates.push({
                mode: 'transfer',
                originCityId: origin.id,
                targetCityId: target.id,
                troops: origin.troops - 1,
                distance: distanceToEnemyCapital(target.id)
            });
        }
    }
    const selected = candidates.sort((left, right)=>left.distance - right.distance || left.targetCityId.localeCompare(right.targetCityId) || left.originCityId.localeCompare(right.originCityId))[0];
    if (!selected) return undefined;
    const { distance: _distance, ...decision } = selected;
    return decision;
}
export function chooseAiAction(state) {
    if (state.status !== 'playing' || state.actionsRemaining < 1) return undefined;
    const rankedAttacks = winningAttacks(state).sort((left, right)=>attackScore(state, right) - attackScore(state, left) || left.targetCityId.localeCompare(right.targetCityId) || left.originCityId.localeCompare(right.originCityId));
    const decisiveCapitalAttack = rankedAttacks.find((decision)=>attackScore(state, decision) >= 10_000);
    return decisiveCapitalAttack ?? threatenedCapitalTransfer(state) ?? rankedAttacks[0] ?? frontlineTransfer(state);
}
const expertV1Policy = createHeuristicPolicy(trainedHeuristicWeights, {
    name: 'baseline-rollout',
    chooseAction: chooseAiAction
});
export function chooseExpertAiAction(state) {
    return expertV1Policy.chooseAction(state);
}
export function chooseAiActionForLevel(state, level) {
    return level === 'expert' ? chooseExpertAiAction(state) : chooseAiAction(state);
}
export function runAiTurn(state, level = 'normal') {
    let next = structuredClone(state);
    const initialLogLength = next.log.length;
    let guard = 0;
    while(next.status === 'playing' && next.actionsRemaining > 0 && guard < 2){
        const decision = chooseAiActionForLevel(next, level);
        if (!decision) break;
        next = decision.mode === 'attack' ? attack(next, decision).state : transfer(next, decision).state;
        guard += 1;
    }
    next.actionsRemaining = 0;
    return {
        state: next,
        events: next.log.slice(initialLogLength)
    };
}
