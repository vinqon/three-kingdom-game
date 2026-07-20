import React, { useMemo, useRef, useState } from './vendor/react/esm-index-production.js';
import { createRoot } from './vendor/react-dom/esm-client-production.js';

import {
  attack,
  beginFactionTurn,
  legalTargets,
  transfer,
} from './game/actions.js';
import { runAiRoundUntilPlayer } from './game/ai-round.js';
import {
  createActionPlayback,
  nextPlaybackPhase,
  playbackDelay,
  visibleStateForPlayback,
} from './game/playback.js';
import { createLiteScenario } from './game/scenario.js';
import { StrategyMap } from './map-canvas.js';

const h = React.createElement;

const FACTIONS = {
  wei: { name: '曹魏', short: '魏', capital: '许昌', color: '#4f7cad', trait: '北方纵深，路线四通八达' },
  shu: { name: '蜀汉', short: '蜀', capital: '成都', color: '#b94f47', trait: '西南相护，适合稳步推进' },
  wu: { name: '孙吴', short: '吴', capital: '建业', color: '#438365', trait: '东南连营，善于侧翼增援' },
};

const MAP_SIZE_OPTIONS = [
  { value: 12, label: '12 城', detail: '短局 · 每国 4 城', testId: 'map-size-12' },
  { value: 21, label: '21 城', detail: '中局 · 每国 7 城', testId: 'map-size-21' },
  { value: 33, label: '33 城', detail: '大战 · 每国 11 城', testId: 'map-size-33' },
];

const ROUTE_OPTIONS = [
  { value: 'sparse', label: '精简', detail: '战线清晰', testId: 'route-density-sparse' },
  { value: 'standard', label: '标准', detail: '攻守均衡', testId: 'route-density-standard' },
  { value: 'dense', label: '密集', detail: '侧翼更多', testId: 'route-density-dense' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '简单', detail: '玩家每城多 1 兵', testId: 'difficulty-easy' },
  { value: 'normal', label: '中等', detail: '三方兵力相同', testId: 'difficulty-normal' },
  { value: 'hard', label: '困难', detail: '玩家每城少 1 兵', testId: 'difficulty-hard' },
];

const DEFAULT_OPTIONS = {
  playerFaction: 'wei',
  mapSize: 33,
  routeDensity: 'standard',
  difficulty: 'easy',
};

const MAP_SIZE_NAMES = { 12: '十二城', 21: '二十一城', 33: '三十三城' };

const ERROR_COPY = {
  CITY_NOT_FOUND: '没有找到这座城市。',
  GAME_OVER: '本局已经结束。',
  NO_ACTIONS_REMAINING: '本回合的两次行动已经用完。',
  CITY_NOT_OWNED: '只能从当前势力控制的城市出发。',
  CITY_NOT_ADJACENT: '两座城市之间没有直接路线。',
  INVALID_TROOP_COUNT: '请输入整数兵力。',
  MUST_LEAVE_ONE_TROOP: '出发城市至少要保留 1 兵。',
  TARGET_NOT_FRIENDLY: '调兵目标必须属于同一势力。',
  TARGET_NOT_ENEMY: '进攻目标必须是敌方城市。',
};

function capitalId(faction) {
  return faction === 'wei' ? 'xuchang' : faction === 'shu' ? 'chengdu' : 'jianye';
}

function factionTotals(state, faction) {
  const cities = Object.values(state.cities).filter((city) => city.owner === faction);
  return { cities: cities.length, troops: cities.reduce((sum, city) => sum + city.troops, 0) };
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function Welcome({ onStart }) {
  return h(
    'main',
    { className: 'welcome-screen' },
    h('div', { className: 'welcome-veil' }),
    h(
      'section',
      { className: 'welcome-card' },
      h('p', { className: 'eyebrow' }, '轻量回合策略'),
      h('h1', null, '三国', h('span', null, '逐鹿天下')),
      h('p', { className: 'welcome-lead' }, '集中兵力，穿过交错边境，同时夺取两座敌国首都。'),
      h(
        'div',
        { className: 'rule-summary' },
        h('span', null, h('b', null, '1'), '自动增兵'),
        h('span', null, h('b', null, '2'), '每回合 2 次行动'),
        h('span', null, h('b', null, '3'), '兵力相减定胜负'),
      ),
      h('button', { className: 'primary-button start-button', 'data-testid': 'start-game', onClick: onStart }, '配置战局'),
    ),
  );
}

function OptionGroup({ title, description, options, value, onChange }) {
  return h(
    'section',
    { className: 'setup-group' },
    h('div', { className: 'setup-group-heading' }, h('strong', null, title), h('small', null, description)),
    h(
      'div',
      { className: 'option-grid' },
      ...options.map((option) => h(
        'button',
        {
          key: option.value,
          className: `option-button${value === option.value ? ' selected' : ''}`,
          'data-testid': option.testId,
          'aria-pressed': value === option.value,
          onClick: () => onChange(option.value),
        },
        h('strong', null, option.label),
        h('small', null, option.detail),
      )),
    ),
  );
}

function CampaignSetup({ onConfirm, onBack }) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const update = (key, value) => setOptions((current) => ({ ...current, [key]: value }));
  return h(
    'main',
    { className: 'faction-screen setup-screen' },
    h(
      'section',
      { className: 'faction-select-card setup-card' },
      h('p', { className: 'eyebrow' }, '配置战局'),
      h('h1', null, '选择你的天下'),
      h('p', { className: 'screen-intro' }, '相同选项每次都会生成相同地图，方便复盘。'),
      h('div', { className: 'setup-section-title' }, h('strong', null, '选择势力'), h('small', null, '另外两国由电脑控制')),
      h(
        'div',
        { className: 'faction-grid' },
        ...Object.entries(FACTIONS).map(([id, faction]) =>
          h(
            'button',
            {
              key: id,
              className: `faction-card faction-${id}${options.playerFaction === id ? ' selected' : ''}`,
              'data-testid': `faction-${id}`,
              'aria-pressed': options.playerFaction === id,
              onClick: () => update('playerFaction', id),
            },
            h('span', { className: 'faction-seal' }, faction.short),
            h('strong', null, faction.name),
            h('small', null, `首都 · ${faction.capital}`),
            h('p', null, faction.trait),
          ),
        ),
      ),
      h(
        'div',
        { className: 'setup-groups' },
        h(OptionGroup, {
          title: '城池规模',
          description: '决定战局长度',
          options: MAP_SIZE_OPTIONS,
          value: options.mapSize,
          onChange: (value) => update('mapSize', value),
        }),
        h(OptionGroup, {
          title: '连接方式',
          description: '国内实线 · 跨国虚线',
          options: ROUTE_OPTIONS,
          value: options.routeDensity,
          onChange: (value) => update('routeDensity', value),
        }),
        h(OptionGroup, {
          title: '难易程度',
          description: '只改变开局兵力',
          options: DIFFICULTY_OPTIONS,
          value: options.difficulty,
          onChange: (value) => update('difficulty', value),
        }),
      ),
      h(
        'div',
        { className: 'screen-actions' },
        h('button', { className: 'secondary-button', onClick: onBack }, '返回'),
        h('button', { className: 'primary-button', 'data-testid': 'confirm-setup', onClick: () => onConfirm(options) }, `以${FACTIONS[options.playerFaction].name}开始战局`),
      ),
    ),
  );
}

function ActionPreview({ state, command, mode, onConfirm, onCancel }) {
  const origin = state.cities[command.originCityId];
  const target = state.cities[command.targetCityId];
  const wins = command.troops > target.troops;
  const resultTroops = mode === 'transfer'
    ? target.troops + command.troops
    : wins
      ? command.troops - target.troops
      : Math.max(1, target.troops - command.troops);

  return h(
    'section',
    { className: `action-preview ${mode}`, 'data-testid': 'battle-preview' },
    h('div', { className: 'preview-route' }, h('strong', null, origin.name), h('span', null, '→'), h('strong', null, target.name)),
    mode === 'transfer'
      ? h('p', null, `调动 ${command.troops} 兵后，${target.name}将有 ${resultTroops} 兵。`)
      : h(
          React.Fragment,
          null,
          h('div', { className: 'battle-equation' },
            h('span', null, h('small', null, '进攻'), h('b', null, command.troops)),
            h('i', null, '对'),
            h('span', null, h('small', null, '守军'), h('b', null, target.troops)),
          ),
          h('p', { className: wins ? 'prediction-win' : 'prediction-hold' },
            wins ? `可以占领，目标留下 ${resultTroops} 兵。` : `进攻失败，守军留下 ${resultTroops} 兵。`,
          ),
        ),
    h(
      'div',
      { className: 'preview-actions' },
      h('button', { className: 'secondary-button', 'data-testid': 'cancel-action', onClick: onCancel }, '取消'),
      h('button', { className: mode === 'attack' ? 'danger-button' : 'primary-button', 'data-testid': 'confirm-action', onClick: onConfirm }, mode === 'attack' ? '确认进攻' : '确认调兵'),
    ),
  );
}

function GameApp({ options, onExit }) {
  const [game, setGame] = useState(() => beginFactionTurn(createLiteScenario(options)));
  const [selectedCityId, setSelectedCityId] = useState(capitalId(options.playerFaction));
  const [mode, setMode] = useState(null);
  const [targetCityId, setTargetCityId] = useState(null);
  const [troops, setTroops] = useState(1);
  const [notice, setNotice] = useState('你的城市已经完成本回合自动增兵。');
  const [busy, setBusy] = useState(false);
  const [playback, setPlayback] = useState(null);
  const [reinforcingFaction, setReinforcingFaction] = useState(null);
  const [reinforcingCityIds, setReinforcingCityIds] = useState([]);
  const skipPlaybackRef = useRef(false);
  const reducedMotionRef = useRef(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  const selectedCity = game.cities[selectedCityId];
  const legalTargetCities = useMemo(
    () => mode && selectedCityId ? legalTargets(game, selectedCityId, mode) : [],
    [game, selectedCityId, mode],
  );
  const legalTargetIds = legalTargetCities.map((city) => city.id);
  const targetCity = targetCityId ? game.cities[targetCityId] : null;
  const maxTroops = Math.max(1, (selectedCity?.troops ?? 2) - 1);
  const command = targetCity
    ? { originCityId: selectedCityId, targetCityId, troops: Math.min(troops, maxTroops) }
    : null;

  function clearCommand(keepOrigin = true) {
    setMode(null);
    setTargetCityId(null);
    setTroops(1);
    if (!keepOrigin) setSelectedCityId(capitalId(game.playerFaction));
  }

  function showError(error) {
    setNotice(ERROR_COPY[error?.code ?? error?.message] ?? '这一步无法执行，请重新选择。');
  }

  function selectCity(cityId) {
    if (busy) return;
    if (mode) {
      if (legalTargetIds.includes(cityId)) {
        setTargetCityId(cityId);
      } else {
        setNotice('当前命令只能选择地图上高亮的邻接城市。');
      }
      return;
    }
    setSelectedCityId(cityId);
    clearCommand(true);
    const city = game.cities[cityId];
    setNotice(city.owner === game.playerFaction ? `已选择${city.name}。` : `${city.name}由${FACTIONS[city.owner].name}控制。`);
  }

  function chooseMode(nextMode) {
    setMode(nextMode);
    setTargetCityId(null);
    setTroops(Math.max(1, maxTroops));
    setNotice(nextMode === 'transfer' ? '请选择高亮的己方邻城。' : '请选择高亮的敌方邻城。');
  }

  async function waitForPlayback(milliseconds, allowSkip) {
    let remaining = milliseconds;
    while (remaining > 0 && !(allowSkip && skipPlaybackRef.current)) {
      const slice = Math.min(50, remaining);
      await delay(slice);
      remaining -= slice;
    }
  }

  async function playAction(before, result, actionMode, actionCommand, actor) {
    const reducedMotion = reducedMotionRef.current;
    let current = {
      ...createActionPlayback(before, result.state, actionMode, actionCommand),
      moveDurationMs: playbackDelay(actor, 'move', reducedMotion),
    };
    setPlayback(current);

    while (current) {
      await waitForPlayback(
        playbackDelay(actor, current.phase, reducedMotionRef.current),
        actor === 'ai',
      );
      if (current.phase === 'resolve') break;
      const phase = nextPlaybackPhase(
        current.phase,
        actor === 'ai' && skipPlaybackRef.current,
      );
      current = { ...current, phase };
      setGame(visibleStateForPlayback(before, result.state, phase));
      setPlayback(current);
    }

    setGame(result.state);
    setNotice(result.message);
    setPlayback(null);
  }

  async function confirmAction() {
    if (!command) return;
    const actionMode = mode;
    const actionCommand = { ...command };
    setBusy(true);
    clearCommand(true);
    try {
      const result = actionMode === 'attack' ? attack(game, actionCommand) : transfer(game, actionCommand);
      await playAction(game, result, actionMode, actionCommand, 'player');
      setSelectedCityId(actionCommand.targetCityId);
    } catch (error) {
      showError(error);
    } finally {
      setPlayback(null);
      setBusy(false);
    }
  }

  async function endPlayerTurn() {
    if (busy || game.status !== 'playing') return;
    skipPlaybackRef.current = false;
    setBusy(true);
    clearCommand(false);
    setNotice('电脑势力正在行动…');
    try {
      const next = await runAiRoundUntilPlayer(game, async (event) => {
        if (event.type === 'turn-start') {
          setGame(event.state);
          setReinforcingFaction(event.faction);
          setReinforcingCityIds(event.reinforcedCityIds);
          const count = event.reinforcedCityIds.length;
          setNotice(count > 0
            ? `${FACTIONS[event.faction].name}回合开始，${count}座城市自动增兵。`
            : `${FACTIONS[event.faction].name}回合开始，城市兵力已达自动上限。`);
          await waitForPlayback(reducedMotionRef.current ? 150 : 700, true);
          setReinforcingFaction(null);
          setReinforcingCityIds([]);
          return;
        }
        setSelectedCityId(event.decision.targetCityId);
        await playAction(
          event.beforeState,
          { state: event.state, message: event.message },
          event.decision.mode,
          event.decision,
          'ai',
        );
      });
      setGame(next);
      const home = Object.values(next.cities).find((city) => city.capitalOf === next.playerFaction && city.owner === next.playerFaction)
        ?? Object.values(next.cities).find((city) => city.owner === next.playerFaction);
      if (home) setSelectedCityId(home.id);
      setNotice(next.status === 'playing' ? `第 ${next.round} 轮开始，你的城市已经自动增兵。` : '战局已经分出胜负。');
    } catch (error) {
      showError(error);
    } finally {
      setPlayback(null);
      setReinforcingFaction(null);
      setReinforcingCityIds([]);
      skipPlaybackRef.current = false;
      setBusy(false);
    }
  }

  const canAct = !busy
    && game.status === 'playing'
    && game.turnFaction === game.playerFaction
    && game.actionsRemaining > 0
    && selectedCity?.owner === game.playerFaction
    && selectedCity.troops > 1;
  const transferCount = selectedCity ? legalTargets(game, selectedCity.id, 'transfer').length : 0;
  const attackCount = selectedCity ? legalTargets(game, selectedCity.id, 'attack').length : 0;

  return h(
    'main',
    { className: 'game-screen' },
    h(
      'header',
      { className: 'topbar' },
      h('div', { className: 'brand-lockup' }, h('strong', null, `三国 · ${MAP_SIZE_NAMES[game.scenario.mapSize]}`), h('small', null, '攻取两座敌国首都')), 
      h('div', { className: 'turn-info' },
        h('span', null, h('small', null, '轮次'), h('b', null, game.round)),
        h('span', null, h('small', null, '当前'), h('b', null, FACTIONS[game.turnFaction].name)),
        h('span', null, h('small', null, '行动'), h('b', null, game.actionsRemaining)),
      ),
      h('button', { className: 'top-restart', 'data-testid': 'restart-game', disabled: busy, onClick: onExit }, '重新开始'),
    ),
    h(
      'section',
      { className: 'score-strip' },
      ...Object.entries(FACTIONS).map(([id, faction]) => {
        const total = factionTotals(game, id);
        return h('div', { key: id, className: `score-item faction-${id}${game.playerFaction === id ? ' player-score' : ''}` },
          h('i', null, faction.short),
          h('span', null, h('strong', null, faction.name), h('small', null, `${total.cities} 城 · ${total.troops} 兵`)),
        );
      }),
    ),
    h(
      'section',
      { className: 'map-region' },
      h(StrategyMap, {
        state: game,
        selectedCityId,
        legalTargetIds,
        lockToLegalTargets: Boolean(mode),
        activeRoute: targetCityId ? [selectedCityId, targetCityId] : null,
        playback,
        reinforcingFaction,
        reinforcingCityIds,
        interactionLocked: busy,
        onSelectCity: selectCity,
      }),
    ),
    h(
      'aside',
      { className: 'command-panel' },
      h('div', { className: 'panel-city-heading' },
        h('div', null,
          h('small', null, selectedCity?.capitalOf ? `${FACTIONS[selectedCity.capitalOf].name}原始首都` : `${FACTIONS[selectedCity?.owner].name}城市`),
          h('h2', null, selectedCity?.name ?? '选择城市'),
        ),
        selectedCity && h('span', { className: `owner-token faction-${selectedCity.owner}` }, FACTIONS[selectedCity.owner].short),
      ),
      selectedCity && h('div', { className: 'troop-panel' }, h('span', null, '当前兵力'), h('b', null, selectedCity.troops), h('small', null, selectedCity.capitalOf ? '自动增长至 8' : '自动增长至 6')),
      h('div', { className: 'action-badge' }, `本回合还可行动 ${game.actionsRemaining} 次`),
      canAct
        ? h(
            React.Fragment,
            null,
            h('div', { className: 'mode-grid' },
              h('button', {
                className: `mode-button${mode === 'transfer' ? ' active' : ''}`,
                'data-testid': 'mode-transfer',
                disabled: transferCount === 0,
                onClick: () => chooseMode('transfer'),
              }, h('strong', null, '调兵'), h('small', null, `${transferCount} 个邻城可选`)),
              h('button', {
                className: `mode-button attack${mode === 'attack' ? ' active' : ''}`,
                'data-testid': 'mode-attack',
                disabled: attackCount === 0,
                onClick: () => chooseMode('attack'),
              }, h('strong', null, '进攻'), h('small', null, `${attackCount} 个敌城可选`)),
            ),
            mode && h('div', { className: 'target-list' },
              h('small', null, mode === 'transfer' ? '选择己方邻城' : '选择敌方邻城'),
              h('div', null, ...legalTargetCities.map((city) => h('button', {
                key: city.id,
                className: targetCityId === city.id ? 'selected' : '',
                onClick: () => setTargetCityId(city.id),
              }, `${city.name} · ${city.troops}兵`))),
            ),
            targetCity && h('label', { className: 'troop-input' },
              h('span', null, mode === 'transfer' ? '调动兵力' : '进攻兵力'),
              h('input', {
                type: 'range',
                min: 1,
                max: maxTroops,
                value: Math.min(troops, maxTroops),
                'data-testid': 'troop-stepper',
                onChange: (event) => setTroops(Number(event.target.value)),
              }),
              h('b', null, Math.min(troops, maxTroops)),
            ),
            command && h(ActionPreview, { state: game, command, mode, onConfirm: confirmAction, onCancel: () => clearCommand(true) }),
          )
        : h('p', { className: 'panel-hint' },
            busy ? (game.turnFaction === game.playerFaction ? '正在播放你的行动。' : '电脑正在行动，请留意地图。') : selectedCity?.owner !== game.playerFaction ? '敌方城市仅供查看，请选择自己的城市。' : game.actionsRemaining === 0 ? '两次行动已用完，可以结束回合。' : '这座城市只有 1 兵，无法出发。',
          ),
      h('div', { className: 'notice-box', role: 'status', 'aria-live': 'polite' }, notice),
      h('section', { className: 'war-log', 'aria-label': '近期战报', 'aria-live': 'polite', 'aria-atomic': 'false' },
        h('div', { className: 'section-title' }, '近期战报'),
        ...(game.log.length
          ? game.log.slice(-5).reverse().map((entry) => h('p', { key: entry.id, className: `log-${entry.faction}` }, entry.message))
          : [h('p', { key: 'empty' }, `${MAP_SIZE_NAMES[game.scenario.mapSize]}列阵，战局即将开始。`)]),
      ),
      busy && game.turnFaction !== game.playerFaction
        ? h('button', {
            className: 'end-turn-button skip-playback-button',
            'data-testid': 'skip-playback',
            onClick: () => {
              skipPlaybackRef.current = true;
              setNotice('正在跳过电脑演出…');
            },
          }, '跳过演出')
        : h('button', {
            className: 'end-turn-button',
            'data-testid': 'end-turn',
            disabled: busy || game.status !== 'playing',
            onClick: endPlayerTurn,
          }, busy ? '行动演出中…' : '结束回合'),
    ),
    game.status !== 'playing' && !playback && h(
      'div',
      { className: 'result-overlay', 'data-testid': game.status === 'victory' ? 'victory-screen' : 'defeat-screen' },
      h('section', { className: 'result-card' },
        h('span', { className: `result-seal ${game.status}` }, game.status === 'victory' ? '胜' : '败'),
        h('p', { className: 'eyebrow' }, game.status === 'victory' ? '天下归一' : '山河易主'),
        h('h1', null, game.status === 'victory' ? `${FACTIONS[game.playerFaction].name}夺取两都` : `${FACTIONS[game.winner]?.name ?? '敌军'}赢得战局`),
        h('p', null, game.status === 'victory' ? '两座敌国原始首都已经同时在你掌控之中。' : '重新调整前线兵力，再试一次。'),
        h('button', { className: 'primary-button', onClick: onExit }, '再开一局'),
      ),
    ),
  );
}

export function App() {
  const [screen, setScreen] = useState('welcome');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  if (screen === 'welcome') return h(Welcome, { onStart: () => setScreen('setup') });
  if (screen === 'setup') return h(CampaignSetup, {
    onBack: () => setScreen('welcome'),
    onConfirm: (selectedOptions) => {
      setOptions(selectedOptions);
      setScreen('game');
    },
  });
  return h(GameApp, { key: JSON.stringify(options), options, onExit: () => setScreen('welcome') });
}

if (typeof document !== 'undefined') {
  createRoot(document.getElementById('root')).render(h(App));
}
