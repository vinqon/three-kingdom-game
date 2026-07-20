import { FACTION_ORDER } from './scenario.js';
import { GameRuleError } from './types.js';
const FACTION_NAMES = {
    wei: '魏',
    shu: '蜀',
    wu: '吴'
};
function cloneState(state) {
    return structuredClone(state);
}
function appendLog(state, message, faction, type) {
    state.log.push({
        id: `log-${state.log.length + 1}`,
        message,
        faction,
        type
    });
}
function cityOrThrow(state, cityId) {
    const city = state.cities[cityId];
    if (!city) throw new GameRuleError('CITY_NOT_FOUND');
    return city;
}
export function reinforceFaction(state, faction) {
    const next = cloneState(state);
    let reinforced = 0;
    for (const city of Object.values(next.cities)){
        if (city.owner !== faction) continue;
        const threshold = city.capitalOf ? 8 : 6;
        if (city.troops < threshold) {
            city.troops += 1;
            reinforced += 1;
        }
    }
    appendLog(next, `${FACTION_NAMES[faction]}回合开始：${reinforced}座城市自动增兵。`, faction, 'reinforce');
    return next;
}
export function beginFactionTurn(state) {
    const next = reinforceFaction(state, state.turnFaction);
    next.actionsRemaining = 2;
    return next;
}
export function legalTargets(state, originCityId, mode) {
    const origin = state.cities[originCityId];
    if (!origin || origin.owner !== state.turnFaction) return [];
    return origin.adjacentCityIds.map((cityId)=>state.cities[cityId]).filter((target)=>mode === 'transfer' ? target.owner === origin.owner : target.owner !== origin.owner);
}
function validateMove(state, command, mode) {
    if (state.status !== 'playing') throw new GameRuleError('GAME_OVER');
    if (state.actionsRemaining < 1) throw new GameRuleError('NO_ACTIONS_REMAINING');
    const origin = cityOrThrow(state, command.originCityId);
    const target = cityOrThrow(state, command.targetCityId);
    if (origin.owner !== state.turnFaction) throw new GameRuleError('CITY_NOT_OWNED');
    if (!origin.adjacentCityIds.includes(target.id)) throw new GameRuleError('CITY_NOT_ADJACENT');
    if (!Number.isInteger(command.troops) || command.troops < 1) {
        throw new GameRuleError('INVALID_TROOP_COUNT');
    }
    if (origin.troops - command.troops < 1) throw new GameRuleError('MUST_LEAVE_ONE_TROOP');
    if (mode === 'transfer' && target.owner !== origin.owner) {
        throw new GameRuleError('TARGET_NOT_FRIENDLY');
    }
    if (mode === 'attack' && target.owner === origin.owner) {
        throw new GameRuleError('TARGET_NOT_ENEMY');
    }
    return {
        origin,
        target
    };
}
export function transfer(state, command) {
    const { origin, target } = validateMove(state, command, 'transfer');
    const next = cloneState(state);
    next.cities[origin.id].troops -= command.troops;
    next.cities[target.id].troops += command.troops;
    next.actionsRemaining -= 1;
    const message = `${origin.name}向${target.name}调兵${command.troops}。`;
    appendLog(next, message, origin.owner, 'transfer');
    return {
        state: evaluateStatus(next),
        message
    };
}
export function attack(state, command) {
    const { origin, target } = validateMove(state, command, 'attack');
    const next = cloneState(state);
    next.cities[origin.id].troops -= command.troops;
    let message;
    if (command.troops > target.troops) {
        const remaining = command.troops - target.troops;
        next.cities[target.id].owner = origin.owner;
        next.cities[target.id].troops = remaining;
        message = `${origin.name}出兵${command.troops}，攻占${target.name}，留下${remaining}兵。`;
    } else {
        const remaining = Math.max(1, target.troops - command.troops);
        next.cities[target.id].troops = remaining;
        message = `${origin.name}出兵${command.troops}进攻${target.name}失败，守军剩${remaining}兵。`;
    }
    next.actionsRemaining -= 1;
    appendLog(next, message, origin.owner, 'attack');
    return {
        state: evaluateStatus(next),
        message
    };
}
export function evaluateStatus(state) {
    const next = cloneState(state);
    for (const faction of FACTION_ORDER){
        const enemyCapitals = Object.values(next.cities).filter((city)=>city.capitalOf && city.capitalOf !== faction);
        if (enemyCapitals.length === 2 && enemyCapitals.every((city)=>city.owner === faction)) {
            next.winner = faction;
            next.status = faction === next.playerFaction ? 'victory' : 'defeat';
            return next;
        }
    }
    if (!Object.values(next.cities).some((city)=>city.owner === next.playerFaction)) {
        next.status = 'defeat';
    }
    return next;
}
function ownsCity(state, faction) {
    return Object.values(state.cities).some((city)=>city.owner === faction);
}
export function endFactionTurn(state) {
    let next = evaluateStatus(state);
    if (next.status !== 'playing') return next;
    const currentIndex = FACTION_ORDER.indexOf(next.turnFaction);
    let candidate = next.turnFaction;
    for(let offset = 1; offset <= FACTION_ORDER.length; offset += 1){
        const faction = FACTION_ORDER[(currentIndex + offset) % FACTION_ORDER.length];
        if (faction === next.playerFaction || ownsCity(next, faction)) {
            candidate = faction;
            break;
        }
    }
    if (candidate === next.playerFaction) next.round += 1;
    next.turnFaction = candidate;
    next.actionsRemaining = 0;
    return beginFactionTurn(next);
}
