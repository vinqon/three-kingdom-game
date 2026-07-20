# Configurable Three Kingdoms Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic 12/21/33-city scenarios, three route densities, and three starting-troop difficulties selectable before the game begins.

**Architecture:** Keep the game engine data-driven. `scenario.ts` owns the canonical 33-city catalog, deterministic subsets, route tiers, validation-friendly scenario options, and starting troop profiles; the existing React entry point owns only the configuration UI and passes options into the engine. The SVG map continues to derive roads and city nodes from `GameState`.

**Tech Stack:** TypeScript game modules, React without JSX, SVG, CSS, Node test runner.

## Global Constraints

- Map sizes are exactly 12, 21, and 33 total cities.
- Every faction owns exactly one capital; capitals never connect directly to other capitals.
- Domestic roads are solid and cross-faction roads are dashed.
- Scenario generation is deterministic and uses no random values.
- Existing turn, AI, combat, playback, and victory rules remain unchanged.
- No new runtime dependencies.

---

### Task 1: Scenario option types and deterministic city sets

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/scenario.test.ts`
- Modify: `src/game/scenario.ts`

**Interfaces:**
- Produces: `MapSize`, `RouteDensity`, `Difficulty`, `ScenarioOptions`, and `createLiteScenario(FactionId | ScenarioOptions): GameState`.
- Produces: `GameState.scenario` for display metadata.

- [ ] **Step 1: Write failing tests** asserting 12/21/33 total cities, equal faction counts, exactly one capital per faction, stable coordinates, and saved scenario metadata.
- [ ] **Step 2: Run `npm test -- src/game/scenario.test.ts`** and verify failures report missing option types/incorrect city counts.
- [ ] **Step 3: Add the option types, 33-city catalog, stable per-size subsets, and backward-compatible scenario constructor.**
- [ ] **Step 4: Re-run `npm test -- src/game/scenario.test.ts`** and verify the size tests pass.

### Task 2: Route density graph generation

**Files:**
- Modify: `src/game/scenario.test.ts`
- Modify: `src/game/scenario.ts`

**Interfaces:**
- Produces: `routesForScenario(mapSize: MapSize, density: RouteDensity): [string, string][]`.
- Consumes: the stable city subset from Task 1.

- [ ] **Step 1: Write failing graph invariant tests** for unique routes, existing endpoints, symmetry after state creation, full connectivity, no capital-to-capital route, and strictly increasing route counts.
- [ ] **Step 2: Run the scenario test** and verify the new route invariant test fails because route tiers do not exist.
- [ ] **Step 3: Implement domestic backbone, domestic tier additions, and border tier additions filtered to the active city set.**
- [ ] **Step 4: Run the scenario test** and verify all graph invariants pass for all nine size/density pairs.

### Task 3: Difficulty troop profiles

**Files:**
- Modify: `src/game/scenario.test.ts`
- Modify: `src/game/scenario.ts`

**Interfaces:**
- Consumes: `ScenarioOptions.difficulty` and `ScenarioOptions.playerFaction`.
- Produces: raw troop values that become the approved player/AI relationship after `beginFactionTurn`.

- [ ] **Step 1: Write failing tests** that call `beginFactionTurn(createLiteScenario(options))` and compare player and AI capital/ordinary troop values for all three difficulties.
- [ ] **Step 2: Run the scenario test** and verify medium/hard fail against the current equal raw troop setup.
- [ ] **Step 3: Implement the raw player troop profiles 5/3, 4/2, and 3/1 for easy/normal/hard while AI remains 5/3.**
- [ ] **Step 4: Run the scenario test** and verify all difficulty assertions pass.

### Task 4: Configurable start screen

**Files:**
- Modify: `src/app-contract.test.mjs`
- Modify: `public/app.js`
- Modify: `public/styles.css`

**Interfaces:**
- Consumes: `ScenarioOptions` through `createLiteScenario(options)`.
- Produces: setup controls with test IDs `map-size-*`, `route-density-*`, `difficulty-*`, and `confirm-setup`.

- [ ] **Step 1: Write failing contract tests** for all configuration labels, test IDs, default values, and the options passed into `GameApp`.
- [ ] **Step 2: Run `npm test -- src/app-contract.test.mjs`** and verify it fails because the setup controls are absent.
- [ ] **Step 3: Replace the faction-only screen with the unified setup screen, keep the existing faction cards, add three compact segmented-control groups, and pass a single options object into `GameApp`.**
- [ ] **Step 4: Add responsive styles using the existing tokens, card surfaces, and button treatments.**
- [ ] **Step 5: Run the contract test** and verify the configuration UI contract passes.

### Task 5: Map road semantics and 33-city density

**Files:**
- Modify: `src/app-contract.test.mjs`
- Modify: `public/map-canvas.js`
- Modify: `public/styles.css`

**Interfaces:**
- Consumes: city `originalOwner`, current `owner`, coordinates, and `GameState.scenario.mapSize`.
- Produces: stable domestic/border route classes and scaled city nodes for large maps.

- [ ] **Step 1: Write failing contract tests** proving road style uses original country ownership, not current conquest ownership, and that the legend explains solid/dashed roads.
- [ ] **Step 2: Run the contract test** and verify it fails on current-owner route classification and missing legend labels.
- [ ] **Step 3: Classify roads by `originalOwner`, add map-size classes and accessible 12/21/33-city labels, and extend the legend.**
- [ ] **Step 4: Add size-aware SVG node scaling and route widths without shrinking hit targets below the current interactive area.**
- [ ] **Step 5: Run the contract test** and verify map semantics pass.

### Task 6: Regression and build verification

**Files:**
- Modify only files required by failing regressions.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: browser-ready modules in `public/game`.

- [ ] **Step 1: Run `npm test`** and fix only regressions caused by the new scenario options.
- [ ] **Step 2: Run `npm run build`** and verify browser modules compile.
- [ ] **Step 3: Run `npm test` again** after the build and verify zero failures.
- [ ] **Step 4: Request `http://127.0.0.1:4173/` with `curl`** and verify HTTP 200 from the existing preview server.

