# AI Action Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every player and AI transfer or attack readable through a three-stage map animation with clear labels, route focus, outcome feedback, and a skip control.

**Architecture:** Keep combat and AI decisions in the existing pure game modules. Add a small pure playback model that describes presentation phases and outcomes, while `public/app.js` owns asynchronous sequencing and `public/map-canvas.js` renders the active route, troop marker, city deltas, and outcome. All animation endpoints continue to use the canonical city coordinates already used by the route graph.

**Tech Stack:** React 19 without JSX, SVG, CSS keyframes and transitions, Node.js built-in TypeScript stripping, Node test runner.

## Global Constraints

- AI timing is announce 600 ms, move 800 ms, resolve 800 ms; player timing totals about 1.2 seconds.
- AI turn reinforcement gets a 700 ms faction announcement and city pulse.
- Reduced-motion phases use 150 ms and no translational animation.
- Skip resolves the current action and runs remaining AI decisions without waits while preserving the same final state and log.
- Transfer and attack use both text labels and distinct colors.
- Map lines, city markers, and moving troop markers must use `CityState.position` from the same scenario graph.
- Controls are locked during playback and always unlock after completion or errors.
- No sound, particles, portraits, new battle screen, rule changes, or AI priority changes.
- This directory is not a Git repository, so commit steps are replaced by verified test checkpoints. The pre-change archive is `/Users/yuyu/Documents/Codex/2026-07-05/h5-pe-backup-before-ai-animation-20260718-1740.tar.gz`.

---

### Task 1: Pure Playback Model

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/playback.ts`
- Create: `src/game/playback.test.ts`
- Modify: `src/app-contract.test.mjs`

**Interfaces:**
- Consumes: `GameState`, `ActionMode`, `MoveCommand`, and `FactionId` from `src/game/types.ts`.
- Produces: `PlaybackPhase`, `PlaybackOutcome`, `ActionPlayback`, `createActionPlayback(before, after, mode, command)`, `nextPlaybackPhase(phase, skip)`, and `playbackDelay(actor, phase, reducedMotion)`.

- [ ] **Step 1: Write failing playback tests**

```ts
it('describes a successful attack without changing either state', () => {
  const before = beginFactionTurn(createLiteScenario('wei'));
  before.cities.xiangyang.troops = 6;
  before.cities.chaisang.troops = 2;
  const command = { originCityId: 'xiangyang', targetCityId: 'chaisang', troops: 5 };
  const after = attack(before, command).state;
  const playback = createActionPlayback(before, after, 'attack', command);
  assert.equal(playback.outcome, 'captured');
  assert.equal(playback.originName, '襄阳');
  assert.equal(playback.targetName, '柴桑');
  assert.equal(playback.afterTargetTroops, 3);
  assert.equal(before.cities.chaisang.owner, 'wu');
});

it('skips directly to resolve and exposes exact timing', () => {
  assert.equal(nextPlaybackPhase('announce', false), 'move');
  assert.equal(nextPlaybackPhase('move', false), 'resolve');
  assert.equal(nextPlaybackPhase('announce', true), 'resolve');
  assert.equal(nextPlaybackPhase('resolve', false), null);
  assert.equal(playbackDelay('ai', 'announce', false), 600);
  assert.equal(playbackDelay('ai', 'move', false), 800);
  assert.equal(playbackDelay('player', 'move', false), 450);
  assert.equal(playbackDelay('ai', 'move', true), 150);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --no-warnings --experimental-strip-types --test src/game/playback.test.ts`

Expected: FAIL because `src/game/playback.ts` does not exist.

- [ ] **Step 3: Define playback types and pure helpers**

Add these exported types to `src/game/types.ts`:

```ts
export type PlaybackPhase = 'announce' | 'move' | 'resolve';
export type PlaybackOutcome = 'transferred' | 'captured' | 'held';

export interface ActionPlayback {
  faction: FactionId;
  mode: ActionMode;
  command: MoveCommand;
  phase: PlaybackPhase;
  originName: string;
  targetName: string;
  beforeTargetOwner: FactionId;
  afterTargetOwner: FactionId;
  beforeTargetTroops: number;
  afterTargetTroops: number;
  outcome: PlaybackOutcome;
}
```

Create `src/game/playback.ts` with:

```ts
import type {
  ActionMode,
  ActionPlayback,
  GameState,
  MoveCommand,
  PlaybackPhase,
} from './types.ts';

export function createActionPlayback(
  before: GameState,
  after: GameState,
  mode: ActionMode,
  command: MoveCommand,
): ActionPlayback {
  const origin = before.cities[command.originCityId];
  const beforeTarget = before.cities[command.targetCityId];
  const afterTarget = after.cities[command.targetCityId];
  return {
    faction: origin.owner,
    mode,
    command: { ...command },
    phase: 'announce',
    originName: origin.name,
    targetName: beforeTarget.name,
    beforeTargetOwner: beforeTarget.owner,
    afterTargetOwner: afterTarget.owner,
    beforeTargetTroops: beforeTarget.troops,
    afterTargetTroops: afterTarget.troops,
    outcome: mode === 'transfer'
      ? 'transferred'
      : beforeTarget.owner !== afterTarget.owner
        ? 'captured'
        : 'held',
  };
}

export function nextPlaybackPhase(
  phase: PlaybackPhase,
  skip: boolean,
): PlaybackPhase | null {
  if (phase === 'resolve') return null;
  if (skip) return 'resolve';
  return phase === 'announce' ? 'move' : 'resolve';
}

export function playbackDelay(
  actor: 'player' | 'ai',
  phase: PlaybackPhase,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 150;
  if (actor === 'ai') return phase === 'announce' ? 600 : 800;
  return phase === 'announce' ? 300 : phase === 'move' ? 450 : 450;
}
```

Update the browser module contract from four modules to five:

```js
assert.deepEqual(modules, ['actions.js', 'ai.js', 'playback.js', 'scenario.js', 'types.js']);
```

- [ ] **Step 4: Run playback and contract tests**

Run: `npm run build && node --no-warnings --experimental-strip-types --test src/game/playback.test.ts src/app-contract.test.mjs`

Expected: all focused tests PASS and `public/game/playback.js` is generated.

- [ ] **Step 5: Record checkpoint**

Run: `shasum -a 256 src/game/types.ts src/game/playback.ts src/game/playback.test.ts src/app-contract.test.mjs`

Expected: four checksum lines, proving the task's exact files are readable.

---

### Task 2: Map Playback Rendering

**Files:**
- Modify: `public/map-canvas.js`
- Modify: `public/styles.css`
- Modify: `src/app-contract.test.mjs`

**Interfaces:**
- Consumes: an optional `playback` object with the `ActionPlayback` fields from Task 1 and an optional `reinforcingFaction` string.
- Produces: `.action-banner`, `.moving-troop`, `.city-delta`, `.playback-origin`, `.playback-target`, `.playback-dimmed`, `.reinforcement-node`, and existing `.active-route` output.

- [ ] **Step 1: Add failing rendering contracts**

Add assertions to `src/app-contract.test.mjs`:

```js
it('renders readable map playback from canonical city coordinates', () => {
  assert.match(mapSource, /playback\.command\.originCityId/);
  assert.match(mapSource, /playback\.command\.targetCityId/);
  assert.match(mapSource, /className: ['"]moving-troop['"]/);
  assert.match(mapSource, /className: ['"]action-banner/);
  assert.match(mapSource, /className: ['"]city-delta/);
  assert.match(mapSource, /origin\.position\.x/);
  assert.match(mapSource, /target\.position\.x/);
});

it('includes readable outcome and reduced-motion presentation', () => {
  assert.match(mapSource, /攻占|守住|调兵/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.moving-troop/);
  assert.match(styles, /\.action-banner/);
});
```

Also read `public/styles.css` at test setup:

```js
const styles = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
```

- [ ] **Step 2: Run contract tests and verify failure**

Run: `npm test -- --test-name-pattern="map playback|readable outcome"`

Expected: FAIL because playback props and CSS classes do not exist.

- [ ] **Step 3: Render the overlay, moving marker, and city states**

Extend `StrategyMap` with `playback` and `reinforcingFaction`. Resolve `origin` and `target` from `state.cities`, and derive the action route from the playback command. Render:

```js
playback && h('div', {
  className: `action-banner ${playback.mode} phase-${playback.phase}`,
  role: 'status',
  'aria-live': 'polite',
  'data-testid': 'action-banner',
},
  h('strong', null, `${FACTION_MARKS[playback.faction]}军${playback.mode === 'attack' ? '进攻' : '调兵'}`),
  h('span', null, `${playback.originName} → ${playback.targetName} · ${playback.command.troops}兵`),
  playback.phase === 'resolve' && h('b', null,
    playback.outcome === 'captured' ? `攻占 · 剩${playback.afterTargetTroops}兵`
      : playback.outcome === 'held' ? `守住 · 剩${playback.afterTargetTroops}兵`
        : `增援完成 · ${playback.afterTargetTroops}兵`,
  ),
);
```

Inside SVG, render the marker only for the move phase. Use a path-independent CSS interpolation between exact endpoints through custom properties:

```js
h('g', {
  className: 'moving-troop',
  style: {
    '--from-x': `${origin.position.x}px`,
    '--from-y': `${origin.position.y}px`,
    '--to-x': `${target.position.x}px`,
    '--to-y': `${target.position.y}px`,
  },
},
  h('circle', { r: 26 }),
  h('text', { x: 0, y: 7 }, playback.command.troops),
);
```

Set origin, target, dimming, reinforcement, and resolve classes on each city group. Render `−N` at the origin during move/resolve and the target outcome label during resolve.

- [ ] **Step 4: Add responsive motion and focus styles**

Add CSS with exact classes and an SVG-safe transform animation:

```css
.action-banner { position: absolute; z-index: 8; top: 12px; left: 50%; min-width: min(520px, calc(100% - 24px)); transform: translateX(-50%); }
.action-banner.transfer { border-color: #d7be68; }
.action-banner.attack { border-color: #db7469; }
.playback-dimmed { opacity: 0.34; }
.playback-origin .city-disc, .playback-target .city-disc { stroke-width: 10; }
.moving-troop { animation: troop-travel 800ms ease-in-out forwards; pointer-events: none; }
.moving-troop circle { fill: #f4d77d; stroke: #fff5cf; stroke-width: 5; }
.moving-troop text, .city-delta { fill: #352514; font-weight: 900; text-anchor: middle; }
.reinforcement-node .city-disc { animation: reinforcement-pulse 700ms ease-out; }
@keyframes troop-travel {
  from { transform: translate(var(--from-x), var(--from-y)); }
  to { transform: translate(var(--to-x), var(--to-y)); }
}
@media (prefers-reduced-motion: reduce) {
  .moving-troop { animation: none; transform: translate(var(--to-x), var(--to-y)); }
}
```

At `max-width: 620px`, keep the banner at `top: 6px`, reduce padding, and retain a minimum 44 px height without covering the topmost city labels.

- [ ] **Step 5: Run focused and full contracts**

Run: `npm test -- --test-name-pattern="map playback|readable outcome|responsive SVG"`

Expected: all selected contract tests PASS.

- [ ] **Step 6: Record checkpoint**

Run: `shasum -a 256 public/map-canvas.js public/styles.css src/app-contract.test.mjs`

Expected: three checksum lines.

---

### Task 3: Player and AI Playback Orchestration

**Files:**
- Modify: `public/app.js`
- Modify: `public/map-canvas.js`
- Modify: `public/styles.css`
- Modify: `src/app-contract.test.mjs`

**Interfaces:**
- Consumes: `createActionPlayback`, `nextPlaybackPhase`, and `playbackDelay` from `public/game/playback.js`.
- Produces: `playAction(before, result, mode, command, actor)`, skip behavior through `skipPlaybackRef`, and `data-testid="skip-playback"`.

- [ ] **Step 1: Add failing orchestration contracts**

Add assertions:

```js
it('stages player and AI actions and supports skipping AI waits', () => {
  assert.match(appSource, /createActionPlayback/);
  assert.match(appSource, /async function playAction/);
  assert.match(appSource, /setPlayback/);
  assert.match(appSource, /skipPlaybackRef\.current/);
  assert.match(appSource, /['"]skip-playback['"]/);
  assert.match(appSource, /reinforcingFaction/);
});
```

- [ ] **Step 2: Run the contract and verify failure**

Run: `npm test -- --test-name-pattern="stages player and AI"`

Expected: FAIL because the orchestration state and skip control do not exist.

- [ ] **Step 3: Add the shared playback runner**

Import React hooks and playback helpers:

```js
import React, { useMemo, useRef, useState } from './vendor/react/esm-index-production.js';
import { createActionPlayback, nextPlaybackPhase, playbackDelay } from './game/playback.js';
```

Add state and refs in `GameApp`:

```js
const [playback, setPlayback] = useState(null);
const [reinforcingFaction, setReinforcingFaction] = useState(null);
const skipPlaybackRef = useRef(false);
const reducedMotionRef = useRef(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
```

Implement `waitForPlayback` in 50 ms slices so clicking skip interrupts the current wait quickly, then implement `playAction`:

```js
async function waitForPlayback(milliseconds, allowSkip) {
  let remaining = milliseconds;
  while (remaining > 0 && !(allowSkip && skipPlaybackRef.current)) {
    const slice = Math.min(50, remaining);
    await delay(slice);
    remaining -= slice;
  }
}

async function playAction(before, result, mode, command, actor) {
  let current = createActionPlayback(before, result.state, mode, command);
  setPlayback(current);
  while (current) {
    const skipped = actor === 'ai' && skipPlaybackRef.current;
    await waitForPlayback(playbackDelay(actor, current.phase, reducedMotionRef.current), actor === 'ai');
    if (current.phase === 'resolve') break;
    const phase = nextPlaybackPhase(current.phase, skipped || skipPlaybackRef.current);
    current = { ...current, phase };
    if (phase === 'resolve') setGame(result.state);
    setPlayback(current);
  }
  setGame(result.state);
  setNotice(result.message);
  setPlayback(null);
}
```

- [ ] **Step 4: Route player actions through playback**

Make `confirmAction` async. Set `busy`, compute the existing rule result once, call `playAction(game, result, mode, command, 'player')`, update selected city, and clear the command in `finally`. Do not call `attack` or `transfer` a second time.

- [ ] **Step 5: Route AI actions and reinforcement through playback**

At the start of `endPlayerTurn`, set `skipPlaybackRef.current = false`. For every AI faction:

```js
setReinforcingFaction(actingFaction);
setGame(next);
setNotice(`${FACTIONS[actingFaction].name}回合开始，城市自动增兵。`);
await waitForPlayback(700, true);
setReinforcingFaction(null);
```

For every AI decision, preserve `before = next`, compute the result once, assign `next = result.state`, then call:

```js
await playAction(before, result, decision.mode, decision, 'ai');
```

Stop immediately if `next.status !== 'playing'`. In `finally`, clear playback and reinforcement state, reset the skip ref, and unlock controls.

- [ ] **Step 6: Add skip control and pass map props**

Pass `playback`, `reinforcingFaction`, and the playback route to `StrategyMap`. During `busy && game.turnFaction !== game.playerFaction`, replace the end-turn label and click behavior:

```js
h('button', {
  className: 'end-turn-button skip-playback-button',
  'data-testid': 'skip-playback',
  onClick: () => {
    skipPlaybackRef.current = true;
    setNotice('正在跳过电脑演出…');
  },
}, '跳过演出')
```

Keep the normal end-turn button when the player is in control. Disable restart and all city interaction while playback is active.

- [ ] **Step 7: Run focused orchestration contracts**

Run: `npm test -- --test-name-pattern="stages player and AI|complete lightweight interaction path"`

Expected: selected tests PASS and the interaction contract includes `skip-playback`.

- [ ] **Step 8: Run the complete verification suite**

Run: `npm run build && npm test`

Expected: build succeeds, every game and browser contract test passes, and `public/game/` contains only `actions.js`, `ai.js`, `playback.js`, `scenario.js`, and `types.js`.

- [ ] **Step 9: Verify the running preview**

Run: `curl -sS -I http://127.0.0.1:4173/`

Expected: `HTTP/1.1 200 OK` with `Content-Type: text/html; charset=utf-8`.

- [ ] **Step 10: Update QA evidence**

Update `design-qa.md` with the final test count, HTTP response, and whether desktop/mobile/reduced-motion visual checks were completed or blocked. Do not claim screenshot QA if the in-app browser runtime remains unavailable.
