import { legalTargets } from './actions.js';
export function enumerateLegalActions(state) {
    if (state.status !== 'playing' || state.actionsRemaining < 1) return [];
    const actions = [];
    const origins = Object.values(state.cities).filter((city)=>city.owner === state.turnFaction && city.troops > 1).sort((left, right)=>left.id.localeCompare(right.id));
    for (const origin of origins){
        for (const mode of [
            'attack',
            'transfer'
        ]){
            const targets = legalTargets(state, origin.id, mode).sort((left, right)=>left.id.localeCompare(right.id));
            for (const target of targets){
                for(let troops = 1; troops < origin.troops; troops += 1){
                    actions.push({
                        mode,
                        originCityId: origin.id,
                        targetCityId: target.id,
                        troops
                    });
                }
            }
        }
    }
    return actions;
}
