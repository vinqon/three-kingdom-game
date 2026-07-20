import { attack, endFactionTurn, transfer } from './actions.js';
import { chooseAiAction } from './ai.js';
function reinforcedCityIds(before, after, faction) {
    return Object.values(after.cities).filter((city)=>city.owner === faction && city.troops === before.cities[city.id].troops + 1).map((city)=>city.id).sort();
}
export async function runAiRoundUntilPlayer(state, observer = ()=>{}) {
    let beforeTurn = state;
    let next = endFactionTurn(state);
    let factionGuard = 0;
    while(next.status === 'playing' && next.turnFaction !== next.playerFaction && factionGuard < 3){
        const actingFaction = next.turnFaction;
        await observer({
            type: 'turn-start',
            faction: actingFaction,
            beforeState: beforeTurn,
            state: next,
            reinforcedCityIds: reinforcedCityIds(beforeTurn, next, actingFaction)
        });
        let actionGuard = 0;
        while(next.status === 'playing' && next.actionsRemaining > 0 && actionGuard < 2){
            const decision = chooseAiAction(next);
            if (!decision) break;
            const beforeState = next;
            const result = decision.mode === 'attack' ? attack(next, decision) : transfer(next, decision);
            next = result.state;
            await observer({
                type: 'action',
                faction: actingFaction,
                beforeState,
                state: next,
                decision,
                message: result.message
            });
            actionGuard += 1;
        }
        if (next.status === 'playing') {
            beforeTurn = next;
            next = endFactionTurn(next);
        }
        factionGuard += 1;
    }
    return next;
}
