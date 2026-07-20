# Three Kingdoms Lite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing 18-city generals-and-defense prototype with the approved 12-city single-player strategy game based only on automatic reinforcement, troop transfer, deterministic attack, and capital capture.

**Architecture:** Keep the existing offline React delivery and TypeScript-to-browser build script. Replace the game core with small pure modules, render routes and city markers from one shared scenario graph in SVG, and let the React UI dispatch only validated core actions. AI uses the same public action functions as the player.

**Tech Stack:** React 19 offline vendor bundle, browser ES modules, TypeScript stripped by Node's `stripTypeScriptTypes`, Node test runner, HTML/CSS/SVG.

## Global Constraints

- Exactly 12 cities: four each for Wei, Shu, and Wu.
- City state has only owner and troops; no generals, defense, food, terrain modifiers, or randomness.
- Every faction turn starts with automatic reinforcement and allows at most two actions.
- Regular cities reinforce up to 6 and original capitals reinforce up to 8; transfer and capture may exceed those thresholds.
- A successful attack requires attacking troops strictly greater than defenders; ties leave one defender.
- Visual routes, adjacency validation, and legal target highlighting consume the same `ROUTES` data.
- Desktop and mobile layouts must remain fully operable without hover-only actions.
- No network dependencies.
- This directory has no `.git`, so commit steps are recorded as checkpoints but cannot create commits.

---

## File Structure

- `src/game/types.ts`: lightweight state, commands, events, errors, and public type contracts.
- `src/game/scenario.ts`: faction metadata, 12 city definitions, coordinates, one canonical route list, and initial state creation.
- `src/game/actions.ts`: reinforcement, target validation, transfer, attack, turn advancement, logs, and status evaluation.
- `src/game/ai.ts`: deterministic selection of up to two legal actions.
- `src/game/*.test.ts`: focused unit coverage for scenario, actions, status, and AI.
- `public/map-canvas.js`: responsive SVG map whose roads and markers derive from scenario state.
- `public/app.js`: start flow, city/target selection, command preview, AI playback, and result screens.
- `public/styles.css`: approved parchment map, dark chrome, faction colors, responsive layout, and interaction states.
- `src/app-contract.test.mjs`: offline payload and required UI/map contract assertions.

### Task 1: Lightweight Scenario and Rule Engine

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/scenario.ts`
- Modify: `src/game/actions.ts`
- Modify: `src/game/scenario.test.ts`
- Modify: `src/game/actions.test.ts`
- Modify: `src/game/status.test.ts`
- Delete: `src/game/battle.ts`, `src/game/battle.test.ts`
- Delete: `src/game/counters.ts`, `src/game/counters.test.ts`
- Delete: `src/game/fixtures.ts`
- Delete: `src/game/qa.ts`, `src/game/qa.test.ts`
- Delete: `src/game/save.ts`, `src/game/save.test.ts`
- Delete: `src/game/simulation.test.ts`
- Delete: `src/game/status.ts` after moving status evaluation into `actions.ts`

**Interfaces:**
- Produces: `createLiteScenario(playerFaction: FactionId): GameState`
- Produces: `beginFactionTurn(state): GameState`
- Produces: `reinforceFaction(state, faction): GameState`
- Produces: `transfer(state, command): ActionResult`
- Produces: `attack(state, command): ActionResult`
- Produces: `endFactionTurn(state): GameState`
- Produces: `legalTargets(state, originId, mode): CityState[]`

- [ ] **Step 1: Write the failing scenario tests**

```ts
it('creates twelve balanced cities and the canonical symmetric graph', () => {
  const state = createLiteScenario('shu');
  assert.equal(Object.keys(state.cities).length, 12);
  assert.equal(state.cities.xuchang.troops, 5);
  assert.equal(state.cities.wan.troops, 3);
  assert.equal(state.turnFaction, 'shu');
  for (const city of Object.values(state.cities)) {
    for (const neighbor of city.adjacentCityIds) {
      assert.ok(state.cities[neighbor].adjacentCityIds.includes(city.id));
    }
  }
});
```

- [ ] **Step 2: Run the scenario test and verify the old 18-city model fails**

Run: `node --test src/game/scenario.test.ts`

Expected: FAIL because `createLiteScenario` and the 12-city graph do not exist.

- [ ] **Step 3: Replace the public game types and scenario**

```ts
export type FactionId = 'wei' | 'shu' | 'wu';
export type GameStatus = 'playing' | 'victory' | 'defeat';
export type ActionMode = 'transfer' | 'attack';

export interface CityState {
  id: string;
  name: string;
  originalOwner: FactionId;
  owner: FactionId;
  troops: number;
  capitalOf?: FactionId;
  adjacentCityIds: string[];
  position: { x: number; y: number };
}

export interface GameState {
  version: 2;
  round: number;
  turnFaction: FactionId;
  playerFaction: FactionId;
  actionsRemaining: number;
  cities: Record<string, CityState>;
  status: GameStatus;
  winner?: FactionId;
  log: GameLogEntry[];
}

export interface MoveCommand { originCityId: string; targetCityId: string; troops: number }
export interface ActionResult { state: GameState; message: string }
```

Define the 12 approved cities and all 18 approved routes in `scenario.ts`, then build each city's `adjacentCityIds` from the exported `ROUTES` array. Set `turnFaction` to the player's faction and call reinforcement once only when the first playable turn begins in the UI.

- [ ] **Step 4: Write failing action tests for every rule edge**

```ts
it('reinforces only to the automatic threshold', () => {
  const state = createLiteScenario('wei');
  state.cities.wan.troops = 6;
  state.cities.xuchang.troops = 8;
  const next = reinforceFaction(state, 'wei');
  assert.equal(next.cities.wan.troops, 6);
  assert.equal(next.cities.xuchang.troops, 8);
});

it('transfers troops while leaving one behind', () => {
  const state = beginFactionTurn(createLiteScenario('wei'));
  const result = transfer(state, { originCityId: 'xuchang', targetCityId: 'wan', troops: 4 });
  assert.equal(result.state.cities.xuchang.troops, 2);
  assert.equal(result.state.cities.wan.troops, 7);
  assert.equal(result.state.actionsRemaining, 1);
});

it('resolves win, loss, and tie deterministically', () => {
  // 5v3 captures with 2; 3v5 leaves 2 defenders; 4v4 leaves 1 defender.
});

it('rejects nonadjacent, wrong-owner, fractional, and leave-zero commands', () => {
  assert.throws(() => transfer(state, badCommand), GameRuleError);
});
```

- [ ] **Step 5: Run action tests and verify they fail**

Run: `node --test src/game/actions.test.ts src/game/status.test.ts`

Expected: FAIL because the lightweight action API is not implemented.

- [ ] **Step 6: Implement immutable actions and status evaluation**

```ts
export function attack(state: GameState, command: MoveCommand): ActionResult {
  const { origin, target } = validateMove(state, command, 'attack');
  const next = structuredClone(state);
  next.cities[origin.id].troops -= command.troops;
  if (command.troops > target.troops) {
    next.cities[target.id].owner = origin.owner;
    next.cities[target.id].troops = command.troops - target.troops;
  } else {
    next.cities[target.id].troops = Math.max(1, target.troops - command.troops);
  }
  next.actionsRemaining -= 1;
  return finishAction(next, origin, target, 'attack');
}
```

`evaluateStatus` checks every faction's ownership of the other two `capitalOf` cities, then checks whether the player owns zero cities. `endFactionTurn` follows the cyclic faction order from the player, skips zero-city AI factions, reinforces the next faction once, and resets `actionsRemaining` to 2.

- [ ] **Step 7: Run the focused game-core tests**

Run: `node --test src/game/scenario.test.ts src/game/actions.test.ts src/game/status.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 8: Record checkpoint**

Record that the rule engine is green. No Git commit is possible because the project directory is not a repository.

### Task 2: Deterministic Two-Action AI

**Files:**
- Modify: `src/game/ai.ts`
- Modify: `src/game/ai.test.ts`

**Interfaces:**
- Consumes: `legalTargets`, `transfer`, `attack`, and the `GameState` contracts from Task 1.
- Produces: `chooseAiAction(state): AiDecision | undefined`
- Produces: `runAiTurn(state): { state: GameState; events: GameLogEntry[] }`

- [ ] **Step 1: Write failing AI priority tests**

```ts
it('takes a capturable enemy capital before any ordinary city', () => {
  const state = aiFixture('wu');
  state.cities.hefei.owner = 'wu';
  state.cities.hefei.troops = 7;
  state.cities.xuchang.troops = 2;
  const choice = chooseAiAction(state);
  assert.deepEqual(choice, { mode: 'attack', originCityId: 'hefei', targetCityId: 'xuchang', troops: 6 });
});

it('never performs more than two actions or leaves an origin empty', () => {
  const result = runAiTurn(aiFixture('shu'));
  assert.ok(result.events.length <= 2);
  assert.ok(Object.values(result.state.cities).every((city) => city.troops >= 1));
});
```

- [ ] **Step 2: Run AI tests and verify failure**

Run: `node --test src/game/ai.test.ts`

Expected: FAIL because the old AI recruits, fortifies, and attacks per city.

- [ ] **Step 3: Implement fixed-priority AI using public actions only**

```ts
export type AiDecision = { mode: ActionMode } & MoveCommand;

export function chooseAiAction(state: GameState): AiDecision | undefined {
  const winningCapitalAttack = scoredWinningAttacks(state)
    .sort(compareCapitalThenWeakestThenId)[0];
  if (winningCapitalAttack) return winningCapitalAttack;
  const reinforcement = threatenedCapitalTransfer(state);
  if (reinforcement) return reinforcement;
  const winningAttack = scoredWinningAttacks(state).sort(compareWeakestThenId)[0];
  return winningAttack ?? routeTroopsTowardFrontline(state);
}
```

Loop while `actionsRemaining > 0`, `status === 'playing'`, and a decision exists. Apply each decision through `attack` or `transfer`; use a two-iteration hard guard.

- [ ] **Step 4: Run AI and all game tests**

Run: `node --test src/game/*.test.ts`

Expected: all active lightweight game tests PASS.

- [ ] **Step 5: Record checkpoint**

Record that AI uses the public rule engine and terminates after at most two actions.

### Task 3: Data-Driven SVG Map and Connection Accuracy

**Files:**
- Modify: `public/map-canvas.js`
- Modify: `src/app-contract.test.mjs`

**Interfaces:**
- Consumes: `state.cities[*].position` and `adjacentCityIds` generated from `ROUTES`.
- Produces: `StrategyMap({ state, selectedCityId, legalTargetIds, activeRoute, onSelectCity })`.

- [ ] **Step 1: Add a failing source contract for one canonical graph**

```js
it('renders SVG roads from city adjacency and shares marker coordinates', () => {
  assert.match(mapSource, /<line|createElement\(['"]line/);
  assert.match(mapSource, /adjacentCityIds/);
  assert.match(mapSource, /viewBox/);
  assert.doesNotMatch(mapSource, /geoPoint|longitude|latitude/);
});
```

- [ ] **Step 2: Run the contract test and verify old canvas behavior fails**

Run: `node --test src/app-contract.test.mjs`

Expected: FAIL because the current canvas has separate geographic projection and clickable HTML markers.

- [ ] **Step 3: Replace the map with one responsive SVG tree**

```js
const routePairs = Object.values(state.cities).flatMap((city) =>
  city.adjacentCityIds
    .filter((targetId) => city.id < targetId)
    .map((targetId) => [city, state.cities[targetId]]),
);

return h('svg', { className: 'strategy-map', viewBox: '0 0 1000 680', 'data-testid': 'game-map' },
  h('g', { className: 'route-layer' }, ...routePairs.map(([from, to]) =>
    h('line', {
      key: `${from.id}-${to.id}`,
      x1: from.position.x, y1: from.position.y,
      x2: to.position.x, y2: to.position.y,
      className: routeClass(from, to, activeRoute),
    }),
  )),
  h('g', { className: 'city-layer' }, ...cities.map((city) => cityNode(city))),
);
```

Place every route and city in the same SVG coordinate system. Render routes first and city nodes second so endpoints disappear beneath the city disks while remaining mathematically centered. Mark capitals with a gold double ring and legal targets with a pulse/highlight class.

- [ ] **Step 4: Run the contract test**

Run: `node --test src/app-contract.test.mjs`

Expected: SVG graph contract PASS.

- [ ] **Step 5: Record checkpoint**

Record that route visuals and legal adjacency are now sourced from the same state graph.

### Task 4: React Game Flow and Responsive Visual System

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `public/index.html`
- Modify: `src/app-contract.test.mjs`

**Interfaces:**
- Consumes: `createLiteScenario`, `beginFactionTurn`, `legalTargets`, `transfer`, `attack`, `runAiTurn`, and `StrategyMap`.
- Produces: a playable welcome → faction selection → game → result flow.

- [ ] **Step 1: Replace the old UI contract with lightweight controls**

```js
const requiredTestIds = [
  'start-game', 'faction-wei', 'faction-shu', 'faction-wu', 'confirm-faction',
  'game-map', 'mode-transfer', 'mode-attack', 'troop-stepper', 'confirm-action',
  'cancel-action', 'end-turn', 'restart-game', 'battle-preview',
  'victory-screen', 'defeat-screen',
];
```

Assert that app copy contains `自动增兵`, `每回合 2 次行动`, `调兵`, `进攻`, and does not contain `粮草|城防|武将|修城|征兵`.

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node --test src/app-contract.test.mjs`

Expected: FAIL because the current app exposes recruit, fortify, generals, seasons, and save controls.

- [ ] **Step 3: Implement selection and command preview state**

```js
const [game, setGame] = useState(() => beginFactionTurn(createLiteScenario(initialFaction)));
const [selectedCityId, setSelectedCityId] = useState(capitalId(initialFaction));
const [mode, setMode] = useState(null);
const [targetCityId, setTargetCityId] = useState(null);
const [troops, setTroops] = useState(1);

const legalTargetIds = useMemo(
  () => mode && selectedCityId
    ? legalTargets(game, selectedCityId, mode).map((city) => city.id)
    : [],
  [game, selectedCityId, mode],
);
```

The map click flow is origin → mode → highlighted target → troop count → deterministic preview → confirm. Clear pending selection after every action and when the turn changes.

- [ ] **Step 4: Implement AI playback and result states**

After the player ends a turn, run the other two factions in cyclic order. Show each returned log message in the battle log with a short CSS transition; disable player controls until the next player turn. Stop immediately if status becomes victory or defeat.

- [ ] **Step 5: Replace styling with the approved single-map composition**

Use a parchment-toned SVG map inside dark green game chrome, blue/red/green faction nodes, gold capital rings, a fixed desktop command rail, and a stacked mobile panel below `860px`. Keep 44px minimum pointer targets, visible focus states, `aria-live` on the battle log, and no body overflow on desktop.

- [ ] **Step 6: Build and run the complete automated suite**

Run: `npm run build`

Expected: `Built browser game modules.`

Run: `npm test`

Expected: all game and browser contract tests PASS.

- [ ] **Step 7: Record checkpoint**

Record the complete green build and test output.

### Task 5: Browser Verification and Connection QA

**Files:**
- Modify only if browser verification exposes a defect.

**Interfaces:**
- Consumes: built `public/` application.
- Produces: verified desktop and mobile behavior.

- [ ] **Step 1: Start the local server**

Run: `npm run dev`

Expected: build succeeds and the preview server prints a localhost URL.

- [ ] **Step 2: Verify the full player flow in a desktop browser**

Start as each faction once. In one full run, verify automatic reinforcement, two actions, transfer, attack win/loss/tie previews, both AI turns, city ownership changes, and capital victory/defeat screens.

- [ ] **Step 3: Inspect every map connection visually**

At desktop and mobile widths, confirm every line begins and ends beneath the correct city disk. Select every city once and compare highlighted legal targets against the visible lines. Confirm the active route highlight follows the selected origin and target.

- [ ] **Step 4: Verify responsive behavior**

At approximately 390×844 and 844×390, confirm the map remains legible, the command panel is reachable, troop controls fit, and no required action depends on hover.

- [ ] **Step 5: Re-run final verification**

Run: `npm run build && npm test`

Expected: build succeeds and every test passes after browser fixes.
