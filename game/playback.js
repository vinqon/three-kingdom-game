export function createActionPlayback(before, after, mode, command) {
    const origin = before.cities[command.originCityId];
    const beforeTarget = before.cities[command.targetCityId];
    const afterTarget = after.cities[command.targetCityId];
    return {
        faction: origin.owner,
        mode,
        command: {
            ...command
        },
        phase: 'announce',
        originName: origin.name,
        targetName: beforeTarget.name,
        beforeTargetOwner: beforeTarget.owner,
        afterTargetOwner: afterTarget.owner,
        beforeTargetTroops: beforeTarget.troops,
        afterTargetTroops: afterTarget.troops,
        outcome: mode === 'transfer' ? 'transferred' : beforeTarget.owner !== afterTarget.owner ? 'captured' : 'held'
    };
}
export function nextPlaybackPhase(phase, skip) {
    if (phase === 'resolve') return null;
    if (skip) return 'resolve';
    return phase === 'announce' ? 'move' : 'resolve';
}
export function playbackDelay(actor, phase, reducedMotion) {
    if (reducedMotion) return 150;
    if (actor === 'ai') return phase === 'announce' ? 600 : 800;
    return phase === 'announce' ? 300 : 450;
}
export function visibleStateForPlayback(before, after, phase) {
    return phase === 'resolve' ? after : before;
}
