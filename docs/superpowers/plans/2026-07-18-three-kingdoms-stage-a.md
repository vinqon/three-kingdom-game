# Three Kingdoms V1 Stage A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable vertical slice: a tested deterministic game engine, an interactive Three.js relief map with three cities, the three-way general counter system, battle preview/settlement, and browser-operable QA fixtures.

**Architecture:** React owns interface composition, Zustand owns application state, a pure TypeScript engine owns all rules, and Three.js renders the map without mutating game state. Stage A uses three representative cities but implements production rule interfaces that Stage B will extend to all 18 cities.

**Tech Stack:** Node.js 24, pnpm 11, Vite, React, TypeScript, Three.js, Zustand, Vitest, Testing Library.

## Global Constraints

- The final target remains the complete V1 described in `docs/superpowers/specs/2026-07-18-three-kingdoms-v1-design.md`; Stage A is not completion.
- Combat uses only troop blocks, general counters, and city defense.
- Counter cycle is strategist > warrior > guardian > strategist; a counter grants exactly 2 strength.
- Combat has no percentages, random values, food, weather, or terrain modifiers.
- Desktop target is 1440×900; responsive checks also cover 390×844 and 844×390.
- All core controls must expose stable `data-testid` values from the acceptance document.
- QA fixtures must call the same production engine functions as normal play.
- Source files remain focused; rule modules do not import React, Zustand, or Three.js.
- Use `apply_patch` for source edits and preserve the existing Markdown requirements.

---

## Planned File Structure

```text
package.json
pnpm-lock.yaml
tsconfig.json
vite.config.ts
vitest.setup.ts
index.html
src/
  main.tsx
  app/App.tsx
  app/app.css
  game/types.ts
  game/counters.ts
  game/battle.ts
  game/actions.ts
  game/fixtures.ts
  game/counters.test.ts
  game/battle.test.ts
  game/actions.test.ts
  stores/gameStore.ts
  stores/gameStore.test.ts
  map/GameMap.tsx
  map/GameMap.test.tsx
  map/createMapScene.ts
  map/map.css
  components/TopBar.tsx
  components/CityPanel.tsx
  components/BattleDialog.tsx
  components/BattleReport.tsx
  components/GeneralBadge.tsx
  components/QaPanel.tsx
  components/components.css
  test/App.test.tsx
  test/battleFlow.test.tsx
  test/qa.test.tsx
```

### Task 1: Bootstrap the Tested Application Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.setup.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/app.css`
- Test: `src/test/App.test.tsx`

**Interfaces:**
- Produces: Vite app entry, `App(): JSX.Element`, Vitest DOM environment, `pnpm dev`, `pnpm test`, `pnpm build`.

- [ ] **Step 1: Create the package manifest and install dependencies**

Create `package.json`:

```json
{
  "name": "three-kingdoms-h5",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "tsc -b --pretty false && vitest run"
  }
}
```

Run:

```bash
pnpm add react react-dom three zustand
pnpm add -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @types/three
```

Expected: `pnpm-lock.yaml` exists and both commands exit 0. If the sandbox cannot resolve the registry, inspect local pnpm/npm stores and existing workspaces first; record dependency installation as an environment blocker rather than replacing React or Three.js with a different architecture.

- [ ] **Step 2: Write the failing application smoke test**

Create `src/test/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';

describe('App', () => {
  it('renders the 229 scenario map shell', () => {
    render(<App />);
    expect(screen.getByText('三国鼎立')).toBeInTheDocument();
    expect(screen.getByText('公元 229 年')).toBeInTheDocument();
    expect(screen.getByTestId('game-map')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the smoke test and confirm RED**

Run: `pnpm test -- src/test/App.test.tsx`

Expected: FAIL because `src/app/App.tsx` does not exist.

- [ ] **Step 4: Add Vite, TypeScript, test setup, and minimal app shell**

Create `src/app/App.tsx`:

```tsx
import './app.css';

export function App() {
  return (
    <main className="app-shell">
      <header className="top-bar">
        <strong>三国鼎立</strong>
        <span>公元 229 年</span>
      </header>
      <section className="map-shell" data-testid="game-map" aria-label="三国立体地图" />
    </main>
  );
}
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
```

Configure `vite.config.ts` with the React plugin and Vitest `jsdom` environment; configure `vitest.setup.ts` to import `@testing-library/jest-dom/vitest`.

- [ ] **Step 5: Run tests and production build**

Run: `pnpm test -- src/test/App.test.tsx && pnpm build`

Expected: smoke test PASS and Vite build exits 0.

- [ ] **Step 6: Initialize local history and checkpoint**

If the workspace is still not a Git repository, run `git init`. Then run:

```bash
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts vitest.setup.ts index.html src
git commit -m "chore: bootstrap three kingdoms app"
```

Expected: one root commit with the tested app shell.

### Task 2: Define Domain Types and Counter Rules

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/counters.ts`
- Test: `src/game/counters.test.ts`

**Interfaces:**
- Produces: `GeneralType`, `FactionId`, `CityState`, `GeneralState`, `GameState`, `BattlePreview`, `BattleResult`, `GameRuleError`, `getCounterBonus(attacker, defender): 0 | 2`, `counters(left, right): boolean`.

- [ ] **Step 1: Write counter-cycle tests**

Create `src/game/counters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { counters, getCounterBonus } from './counters';

describe('general counters', () => {
  it.each([
    ['strategist', 'warrior'],
    ['warrior', 'guardian'],
    ['guardian', 'strategist'],
  ] as const)('%s counters %s', (left, right) => {
    expect(counters(left, right)).toBe(true);
    expect(getCounterBonus(left, right)).toBe(2);
    expect(getCounterBonus(right, left)).toBe(0);
  });

  it('gives no bonus to equal types', () => {
    expect(getCounterBonus('warrior', 'warrior')).toBe(0);
  });
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/game/counters.test.ts`

Expected: FAIL because `counters.ts` is missing.

- [ ] **Step 3: Implement focused domain types and counter lookup**

Create `src/game/counters.ts`:

```ts
import type { GeneralType } from './types';

const COUNTERS: Record<GeneralType, GeneralType> = {
  strategist: 'warrior',
  warrior: 'guardian',
  guardian: 'strategist',
};

export function counters(left: GeneralType, right: GeneralType): boolean {
  return COUNTERS[left] === right;
}

export function getCounterBonus(left?: GeneralType, right?: GeneralType): 0 | 2 {
  return left && right && counters(left, right) ? 2 : 0;
}
```

Define all interfaces from the design spec in `src/game/types.ts`. Add `BattlePreview` with attacker/defender strengths, bonuses, winner, and equation parts; add `BattleResult` with remaining troops and Chinese reason text; add `GameRuleError` with a stable `code` string.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/game/counters.test.ts`

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/counters.ts src/game/counters.test.ts
git commit -m "feat: define general counter rules"
```

### Task 3: Implement Deterministic Battle Preview and Settlement

**Files:**
- Create: `src/game/battle.ts`
- Test: `src/game/battle.test.ts`

**Interfaces:**
- Consumes: `GeneralType`, `CityState`, `getCounterBonus`.
- Produces: `previewBattle(input): BattlePreview`, `settleBattle(input): BattleResult`.

- [ ] **Step 1: Write failing acceptance-level battle tests**

Create `src/game/battle.test.ts` with exact cases:

```ts
import { describe, expect, it } from 'vitest';
import { previewBattle, settleBattle } from './battle';

describe('battle', () => {
  it('lets a strategist counter a warrior', () => {
    const preview = previewBattle({
      attackingTroops: 5,
      defendingTroops: 3,
      defense: 1,
      attackerType: 'strategist',
      defenderType: 'warrior',
    });
    expect(preview).toMatchObject({ attackerStrength: 7, defenderStrength: 4, winner: 'attacker' });
  });

  it('awards a tied battle to the defender', () => {
    expect(previewBattle({
      attackingTroops: 6,
      defendingTroops: 5,
      defense: 1,
      attackerType: 'warrior',
      defenderType: 'warrior',
    }).winner).toBe('defender');
  });

  it('applies fixed losses without reducing the winner below one', () => {
    expect(settleBattle({
      attackingTroops: 2,
      defendingTroops: 1,
      defense: 1,
      attackerType: 'strategist',
      defenderType: 'warrior',
    })).toMatchObject({ winner: 'attacker', attackerRemaining: 1, defenderRemaining: 0 });
  });
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/game/battle.test.ts`

Expected: FAIL because battle functions are missing.

- [ ] **Step 3: Implement battle calculations as pure functions**

Implement `previewBattle` with `attackingTroops + attackerCounterBonus` and `defendingTroops + defenderCounterBonus + defense`. Implement `settleBattle` by subtracting 1 from the winner with a floor of 1 and subtracting 2 from the loser with a floor of 0. Reject troops outside 0–10 and defense outside 1–3 with typed `GameRuleError` codes.

- [ ] **Step 4: Run battle and full unit suite**

Run: `pnpm test -- src/game/battle.test.ts src/game/counters.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/battle.ts src/game/battle.test.ts
git commit -m "feat: add deterministic battle engine"
```

### Task 4: Implement City Actions, Movement, and Three-City Fixture

**Files:**
- Create: `src/game/actions.ts`
- Create: `src/game/fixtures.ts`
- Test: `src/game/actions.test.ts`

**Interfaces:**
- Consumes: game domain types and `settleBattle`.
- Produces: `createStageAFixture()`, `recruit(state, cityId)`, `fortify(state, cityId)`, `attack(state, command)`, `endFactionTurn(state)`.

- [ ] **Step 1: Write failing tests for limits and ownership changes**

Cover these assertions in `actions.test.ts`:

```ts
expect(recruit(state, 'luoyang').cities.luoyang.troops).toBe(7);
expect(() => recruit(maxTroopState, 'luoyang')).toThrowError('TROOPS_AT_MAX');
expect(fortify(state, 'luoyang').cities.luoyang.defense).toBe(2);
expect(() => fortify(maxDefenseState, 'luoyang')).toThrowError('DEFENSE_AT_MAX');
expect(() => attack(state, nonAdjacentCommand)).toThrowError('CITY_NOT_ADJACENT');
expect(attack(state, winningCommand).cities.xuchang.owner).toBe('wei');
expect(attack(state, winningCommand).cities.xuchang.defense).toBe(1);
```

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/game/actions.test.ts`

Expected: FAIL because action functions are missing.

- [ ] **Step 3: Add the production fixture and immutable actions**

`createStageAFixture()` returns Luoyang (Wei), Xuchang (Shu), and Jianye (Wu) connected in a line, one general of each type, year 229, spring, Wei player turn. Each action clones only affected records, validates owner/turn/limits, and appends one structured log event.

- [ ] **Step 4: Add retreat cases**

Extend tests for attacker return, defender retreat to adjacent friendly city, and defender removal when no route exists. Implement deterministic retreat selection by sorting eligible city ids and taking the first.

- [ ] **Step 5: Run tests**

Run: `pnpm test -- src/game/actions.test.ts src/game/battle.test.ts`

Expected: all action and battle tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/actions.ts src/game/actions.test.ts src/game/fixtures.ts
git commit -m "feat: add city actions and attack flow"
```

### Task 5: Add the Zustand Store and City Controls

**Files:**
- Create: `src/stores/gameStore.ts`
- Create: `src/stores/gameStore.test.ts`
- Create: `src/components/TopBar.tsx`
- Create: `src/components/CityPanel.tsx`
- Create: `src/components/GeneralBadge.tsx`
- Create: `src/components/components.css`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: stage A fixture and action functions.
- Produces: `useGameStore`, city selection, `recruitSelected`, `fortifySelected`, attack draft state.

- [ ] **Step 1: Write a failing store action test**

```ts
it('selects Luoyang and recruits through the engine', () => {
  useGameStore.getState().reset(createStageAFixture());
  useGameStore.getState().selectCity('luoyang');
  useGameStore.getState().recruitSelected();
  expect(useGameStore.getState().game.cities.luoyang.troops).toBe(7);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/stores/gameStore.test.ts`

Expected: FAIL because store is missing.

- [ ] **Step 3: Implement the store as a thin adapter**

The store may select UI state and call engine functions, but it must not duplicate counter, battle, ownership, or limit rules. Catch `GameRuleError` and expose one Chinese `notice` string.

- [ ] **Step 4: Build the top bar and city panel**

`CityPanel` displays city name, faction, troop blocks, defense shields, general badge, and buttons with `data-testid="recruit"`, `data-testid="fortify"`, and `data-testid="attack"`. Disable invalid actions and retain an explanatory `aria-description`.

- [ ] **Step 5: Run component and store tests**

Add Testing Library assertions that clicking `recruit` increases visible troop blocks and disables both actions for the city this turn.

Run: `pnpm test -- src/stores/gameStore.test.ts src/test/App.test.tsx`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stores src/components src/app/App.tsx
git commit -m "feat: connect city controls to game store"
```

### Task 6: Render the Interactive Three.js Relief Map

**Files:**
- Create: `src/map/createMapScene.ts`
- Create: `src/map/GameMap.tsx`
- Create: `src/map/map.css`
- Modify: `src/app/App.tsx`
- Test: `src/map/GameMap.test.tsx`

**Interfaces:**
- Consumes: three city view models and `onSelectCity(cityId)`.
- Produces: orthographic Three.js scene, drag/zoom camera, city picking, selected-city highlight, cleanup function.

- [ ] **Step 1: Add a failing lifecycle test**

Mock `createMapScene` and assert `GameMap` initializes it once with the canvas host and calls returned `dispose()` on unmount.

Run: `pnpm test -- src/map/GameMap.test.tsx`

Expected: FAIL because `GameMap` is missing.

- [ ] **Step 2: Implement scene creation**

Use an `OrthographicCamera`, `WebGLRenderer`, ambient plus directional light, and a subdivided plane whose vertex heights combine broad sinusoidal ridges. Add a blue water plane, extruded river ribbons, low-poly mountains, and three city groups with walls, roofs, and faction flags. Use real meshes, not CSS art or placeholder rectangles.

- [ ] **Step 3: Implement interaction and cleanup**

Use pointer events and `Raycaster` to select cities. Implement drag pan with pointer capture and wheel/pinch zoom clamped to useful limits. Dispose geometries, materials, renderer, listeners, and animation frame on unmount.

- [ ] **Step 4: Integrate the map into App**

Render `<GameMap data-testid="game-map" />` as the full-bleed center surface and overlay React city labels and controls. Keep stable dimensions so selection does not resize the canvas.

- [ ] **Step 5: Run tests and build**

Run: `pnpm test && pnpm build`

Expected: all tests PASS and build exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/map src/app
git commit -m "feat: render interactive three dimensional map"
```

### Task 7: Add Battle Preview, Confirmation, and Report

**Files:**
- Create: `src/components/BattleDialog.tsx`
- Create: `src/components/BattleReport.tsx`
- Modify: `src/stores/gameStore.ts`
- Modify: `src/app/App.tsx`
- Test: `src/test/battleFlow.test.tsx`

**Interfaces:**
- Consumes: selected origin/target, selected general, troop count, `previewBattle`, `attack`.
- Produces: accessible modal with total-strength equation, confirm action, report modal, map ownership update.

- [ ] **Step 1: Write a failing browser-like interaction test**

Render `App` with the `counter-strategist` fixture, select origin and target, choose 5 troop blocks, and assert:

```tsx
expect(screen.getByTestId('battle-preview')).toHaveTextContent('7');
expect(screen.getByTestId('battle-preview')).toHaveTextContent('4');
await user.click(screen.getByTestId('confirm-battle'));
expect(screen.getByTestId('battle-report')).toHaveTextContent('我方获胜');
```

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/test/battleFlow.test.tsx`

Expected: FAIL because battle dialog and report are missing.

- [ ] **Step 3: Implement the battle draft and modal**

Use a segmented general selector and numeric stepper. Display `兵力 + 克制 = 总战力` for attackers and `兵力 + 克制 + 城防 = 总战力` for defenders. Show “我方会获胜” or “我方会失败” before confirmation.

- [ ] **Step 4: Implement settlement report**

Confirm by calling the production `attack` action once. Lock the button during settlement. The report shows losses, retreat, ownership change, and one plain-Chinese reason sentence.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test -- src/test/battleFlow.test.tsx && pnpm build`

Expected: PASS and build exits 0.

```bash
git add src/components src/stores/gameStore.ts src/app/App.tsx src/test/battleFlow.test.tsx
git commit -m "feat: add transparent battle flow"
```

### Task 8: Add QA Fixtures and the Browser-Operable QA Panel

**Files:**
- Modify: `src/game/fixtures.ts`
- Create: `src/components/QaPanel.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/test/qa.test.tsx`

**Interfaces:**
- Produces: `createQaFixture(id: QaScenarioId): GameState` for Stage A scenarios and UI controls `qa-scenario`, `qa-load`.

- [ ] **Step 1: Write failing fixture parity tests**

Verify `counter-strategist`, `counter-warrior`, `counter-guardian`, `same-type-tie`, `fortress-defense`, `attack-win`, and `attack-retreat` produce the exact strength values in acceptance cases B01–B08 when passed through `previewBattle`.

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm test -- src/test/qa.test.tsx`

Expected: FAIL because QA fixture factory and panel are missing.

- [ ] **Step 3: Implement deterministic fixtures**

Store fixture definitions as data and build normal `GameState` objects. Do not hard-code expected results into UI; QA preview and settlement must call the production engine.

- [ ] **Step 4: Implement the QA panel**

Show only when `new URLSearchParams(location.search).get('qa') === '1'`. Provide a native select with `data-testid="qa-scenario"` and load button with `data-testid="qa-load"`.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test && pnpm build`

Expected: all tests PASS and build exits 0.

```bash
git add src/game/fixtures.ts src/components/QaPanel.tsx src/app/App.tsx src/test/qa.test.tsx
git commit -m "test: add deterministic qa scenarios"
```

### Task 9: Responsive Polish and Stage A Browser Verification

**Files:**
- Modify: `src/app/app.css`
- Modify: `src/map/map.css`
- Modify: `src/components/components.css`
- Create: `artifacts/acceptance-stage-a/report.md`
- Create: `artifacts/acceptance-stage-a/screenshots/`

**Interfaces:**
- Consumes: running Vite URL and Stage A QA fixtures.
- Produces: verified desktop/mobile vertical slice and evidence report.

- [ ] **Step 1: Establish responsive layout constraints**

Desktop uses a full-height map with a right-side 320px operation panel. At widths below 760px, move the panel to a bottom sheet capped at 44vh. Use fixed 44px minimum touch targets, safe-area padding, nonnegative letter spacing, and no viewport-scaled font sizes.

- [ ] **Step 2: Run automated checks**

Run: `pnpm check && pnpm build`

Expected: TypeScript and all tests PASS; production build exits 0.

- [ ] **Step 3: Start the development server**

Run: `pnpm dev`

Expected: Vite reports a local `http://127.0.0.1:<port>/` URL and remains running during browser checks.

- [ ] **Step 4: Verify with the Codex in-app browser**

Open `/?qa=1` at 1440×900. Load every Stage A fixture and operate the real battle flow. Capture start, map, selected city, counter preview, report, zoomed-out, and zoomed-in screenshots.

- [ ] **Step 5: Verify responsive states**

Repeat core selection and battle preview at 390×844 and 844×390. Confirm the canvas is nonblank, the city remains visible, controls do not overlap, and the longest labels fit.

- [ ] **Step 6: Inspect runtime evidence**

Confirm no unhandled console errors or missing model/texture/map requests. Verify rapid double-clicking confirm does not settle twice. Record any Stage B gaps explicitly without marking Stage A as full V1 completion.

- [ ] **Step 7: Write the Stage A report and checkpoint**

Write `artifacts/acceptance-stage-a/report.md` with commands, results, viewport evidence, screenshot paths, failures, and a `PASS` or `FAIL` conclusion for Stage A only.

```bash
git add src artifacts/acceptance-stage-a
git commit -m "feat: complete stage a vertical slice"
```

## Stage A Exit Gate

Stage A passes only when Tasks 1–9 are complete, all tests and the production build pass, the interactive Three.js canvas is verified nonblank in all three viewports, all Stage A QA scenarios use production rules, and the Stage A report concludes `PASS`.

After Stage A, write and execute separate plans for Stage B (18-city full game, turns, AI, save, victory/defeat) and Stage C (historical map refinement, final assets, performance, and complete acceptance evidence).
