import React from './vendor/react/esm-index-production.js';

const h = React.createElement;

const FACTION_MARKS = { wei: '魏', shu: '蜀', wu: '吴' };

function routePairs(state) {
  return Object.values(state.cities).flatMap((city) =>
    city.adjacentCityIds
      .filter((targetId) => city.id < targetId)
      .map((targetId) => [city, state.cities[targetId]]),
  );
}

function sameRoute(activeRoute, leftId, rightId) {
  if (!activeRoute?.length) return false;
  return (
    (activeRoute[0] === leftId && activeRoute[1] === rightId) ||
    (activeRoute[0] === rightId && activeRoute[1] === leftId)
  );
}

export function StrategyMap({
  state,
  selectedCityId,
  legalTargetIds = [],
  lockToLegalTargets = false,
  activeRoute,
  playback,
  reinforcingFaction,
  reinforcingCityIds = [],
  interactionLocked = false,
  onSelectCity,
}) {
  const legal = new Set(legalTargetIds);
  const selected = selectedCityId ? state.cities[selectedCityId] : null;
  const roads = routePairs(state);
  const playbackOriginId = playback && playback.command.originCityId;
  const playbackTargetId = playback && playback.command.targetCityId;
  const origin = playbackOriginId ? state.cities[playbackOriginId] : null;
  const target = playbackTargetId ? state.cities[playbackTargetId] : null;
  const playbackRoute = playback ? [playbackOriginId, playbackTargetId] : activeRoute;
  const outcomeCopy = playback?.outcome === 'captured'
    ? `攻占 · 剩${playback.afterTargetTroops}兵`
    : playback?.outcome === 'held'
      ? `守住 · 剩${playback.afterTargetTroops}兵`
      : playback
        ? `增援完成 · ${playback.afterTargetTroops}兵`
        : '';
  const reinforcing = new Set(reinforcingCityIds);

  return h(
    'div',
    {
      className: [
        'map-frame',
        playback ? 'playback-active' : '',
        playback ? `playback-${playback.mode}` : '',
        reinforcingFaction ? 'reinforcement-active' : '',
      ].filter(Boolean).join(' '),
    },
    reinforcingFaction && !playback && h(
      'div',
      {
        className: 'action-banner reinforcement reinforcement-banner',
        role: 'status',
        'aria-live': 'polite',
        'data-testid': 'reinforcement-banner',
      },
      h('strong', null, `${FACTION_MARKS[reinforcingFaction]}军回合`),
      h('span', null, reinforcingCityIds.length > 0
        ? `${reinforcingCityIds.length}座城市自动增兵 +1`
        : '城市均已达自动增兵上限'),
      h('b', null, reinforcingCityIds.length > 0 ? '增兵完成' : '整军完毕'),
    ),
    playback && h(
      'div',
      {
        className: `action-banner ${playback.mode} phase-${playback.phase}`,
        role: 'status',
        'aria-live': 'polite',
        'data-testid': 'action-banner',
      },
      h('strong', null, `${FACTION_MARKS[playback.faction]}军${playback.mode === 'attack' ? '进攻' : '调兵'}`),
      h('span', null, `${playback.originName} → ${playback.targetName} · ${playback.command.troops}兵`),
      playback.phase === 'resolve' && h('b', null, outcomeCopy),
    ),
    h(
      'svg',
      {
        className: 'strategy-map',
        viewBox: '0 0 1000 680',
        role: 'region',
        'aria-label': '三国十二城战略地图',
        'data-testid': 'game-map',
      },
      h('image', {
        className: 'map-terrain',
        href: './assets/three-kingdoms-terrain.png',
        x: 0,
        y: 0,
        width: 1000,
        height: 680,
        preserveAspectRatio: 'xMidYMid slice',
      }),
      h('rect', { className: 'map-wash', x: 0, y: 0, width: 1000, height: 680 }),
      h(
        'g',
        { className: 'route-layer' },
        ...roads.map(([from, to]) => {
          const touchesSelection = selected && (from.id === selected.id || to.id === selected.id);
          const otherId = from.id === selected?.id ? to.id : from.id;
          const isLegal = touchesSelection && legal.has(otherId);
          const isActive = sameRoute(playbackRoute, from.id, to.id);
          return h('line', {
            key: `${from.id}-${to.id}`,
            x1: from.position.x,
            y1: from.position.y,
            x2: to.position.x,
            y2: to.position.y,
            className: `map-route${from.owner !== to.owner ? ' border-route' : ''}${isLegal ? ' legal-route' : ''}${isActive ? ' active-route' : ''}`,
            'data-route': `${from.id}-${to.id}`,
          });
        }),
      ),
      h(
        'g',
        { className: 'city-layer' },
        ...Object.values(state.cities).map((city) => {
          const isSelected = city.id === selectedCityId;
          const isLegal = legal.has(city.id);
          const isDisabled = interactionLocked || (lockToLegalTargets && !isLegal);
          const isPlaybackOrigin = city.id === playbackOriginId;
          const isPlaybackTarget = city.id === playbackTargetId;
          const isPlaybackDimmed = playback && !isPlaybackOrigin && !isPlaybackTarget;
          const isReinforcing = reinforcing.has(city.id);
          const classes = [
            'city-node',
            `faction-${city.owner}`,
            city.capitalOf ? 'capital-node' : '',
            isSelected ? 'selected-node' : '',
            isLegal ? 'legal-node' : '',
            isPlaybackOrigin ? 'playback-origin' : '',
            isPlaybackTarget ? 'playback-target' : '',
            isPlaybackDimmed ? 'playback-dimmed' : '',
            isReinforcing ? 'reinforcement-node' : '',
          ].filter(Boolean).join(' ');
          return h(
            'g',
            {
              key: city.id,
              className: classes,
              transform: `translate(${city.position.x} ${city.position.y})`,
              role: 'button',
              tabIndex: isDisabled ? -1 : 0,
              'aria-disabled': isDisabled ? 'true' : undefined,
              'data-testid': `city-${city.id}`,
              'aria-label': `${city.name}，${FACTION_MARKS[city.owner]}，${city.troops}兵${city.capitalOf ? '，首都' : ''}`,
              onClick: () => {
                if (!isDisabled) onSelectCity(city.id);
              },
              onKeyDown: (event) => {
                if (!isDisabled && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onSelectCity(city.id);
                }
              },
            },
            h('circle', { className: 'city-hit-area', r: 60 }),
            city.capitalOf && h('circle', { className: 'capital-ring', r: 42 }),
            isLegal && h('circle', { className: 'legal-ring', r: 39 }),
            h('circle', { className: 'city-disc', r: 31 }),
            h('text', { className: 'troop-count', x: 0, y: 7 }, city.troops),
            h('text', { className: 'city-label', x: 0, y: 57 }, city.name),
            h('text', { className: 'faction-mark', x: 22, y: -21 }, FACTION_MARKS[city.owner]),
            isPlaybackOrigin && playback.phase !== 'announce' && h(
              'text',
              { className: 'city-delta', x: 0, y: -51 },
              `−${playback.command.troops}`,
            ),
            isPlaybackTarget && playback.phase === 'resolve' && h(
              'text',
              { className: 'city-delta target-delta', x: 0, y: -51 },
              playback.outcome === 'captured' ? '攻占' : playback.outcome === 'held' ? '守住' : `+${playback.command.troops}`,
            ),
          );
        }),
      ),
      playback?.phase === 'move' && origin && target && h(
        'g',
        {
          className: 'moving-troop',
          style: {
            '--from-x': `${origin.position.x}px`,
            '--from-y': `${origin.position.y}px`,
            '--to-x': `${target.position.x}px`,
            '--to-y': `${target.position.y}px`,
            '--travel-duration': `${playback.moveDurationMs}ms`,
          },
          'aria-hidden': 'true',
        },
        h('circle', { r: 28 }),
        h('text', { x: 0, y: 8 }, playback.command.troops),
      ),
    ),
    h(
      'div',
      { className: 'map-legend', 'aria-hidden': 'true' },
      h('span', null, h('i', { className: 'legend-dot faction-wei' }), '魏'),
      h('span', null, h('i', { className: 'legend-dot faction-shu' }), '蜀'),
      h('span', null, h('i', { className: 'legend-dot faction-wu' }), '吴'),
      h('span', null, h('i', { className: 'legend-capital' }), '首都'),
    ),
  );
}
