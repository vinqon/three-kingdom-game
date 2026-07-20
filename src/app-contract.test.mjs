import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { describe, it } from 'node:test';

const appSource = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const mapSource = await readFile(new URL('../public/map-canvas.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
const scenarioSource = await readFile(new URL('./game/scenario.ts', import.meta.url), 'utf8');

describe('lightweight browser game contract', () => {
  it('uses precomputed city coordinates without runtime route geometry', () => {
    assert.doesNotMatch(
      scenarioSource,
      /ROUTE_CLEARANCE|ROUTE_ENDPOINT_MARGIN|splitRouteAtBlockingCities|splitRoutesUntilClear/,
    );
    assert.match(scenarioSource, /return uniqueRoutes\(routes\);/);
  });

  it('exposes the complete lightweight interaction path', () => {
    const appTestIds = [
      'start-game',
      'confirm-setup',
      'mode-transfer',
      'mode-attack',
      'troop-stepper',
      'battle-preview',
      'confirm-action',
      'cancel-action',
      'end-turn',
      'restart-game',
      'victory-screen',
      'defeat-screen',
    ];
    for (const testId of appTestIds) {
      assert.match(appSource, new RegExp(`['"]${testId}['"]`), testId);
    }
    assert.match(appSource, /`faction-\$\{id\}`/);
    assert.match(appSource, /wei:|shu:|wu:/);
    assert.match(mapSource, /['"]game-map['"]/);
    assert.match(mapSource, /`city-\$\{city\.id\}`/);
  });

  it('offers deterministic campaign size, route, and difficulty options before starting', () => {
    for (const testId of [
      'map-size-12', 'map-size-21', 'map-size-33',
      'route-density-sparse', 'route-density-standard', 'route-density-dense',
      'difficulty-easy', 'difficulty-normal', 'difficulty-hard',
    ]) {
      assert.match(appSource, new RegExp(`['"]${testId}['"]`), testId);
    }
    assert.match(appSource, /城池规模/);
    assert.match(appSource, /连接方式/);
    assert.match(appSource, /难易程度/);
    assert.match(appSource, /mapSize:\s*33/);
    assert.match(appSource, /routeDensity:\s*['"]standard['"]/);
    assert.match(appSource, /difficulty:\s*['"]easy['"]/);
    assert.match(appSource, /createLiteScenario\(options\)/);
  });

  it('uses one responsive SVG graph for roads and city markers', () => {
    assert.match(mapSource, /h\(\s*['"]svg['"]/);
    assert.match(mapSource, /h\(\s*['"]line['"]/);
    assert.match(mapSource, /adjacentCityIds/);
    assert.match(mapSource, /position\.x/);
    assert.match(mapSource, /position\.y/);
    assert.match(mapSource, /viewBox/);
    assert.doesNotMatch(mapSource, /geoPoint|longitude|latitude|getContext\(['"]2d/);
    assert.match(mapSource, /role: ['"]region['"]/);
    assert.match(mapSource, /className: ['"]city-hit-area['"]/);
  });

  it('keeps domestic roads solid and original cross-country roads dashed', () => {
    assert.match(mapSource, /from\.originalOwner !== to\.originalOwner/);
    assert.doesNotMatch(mapSource, /from\.owner !== to\.owner/);
    assert.match(mapSource, /国内实线/);
    assert.match(mapSource, /跨国虚线/);
    assert.match(mapSource, /map-size-\$\{state\.scenario\.mapSize\}/);
    assert.match(styles, /\.map-route\.border-route[\s\S]*stroke-dasharray/);
    assert.match(styles, /\.map-size-33/);
  });

  it('keeps the 33-city map pannable and touch-readable on phones', () => {
    assert.match(mapSource, /map-pan-hint/);
    assert.match(mapSource, /滑动地图查看全部城市/);
    assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.map-frame\.map-size-33[\s\S]*overflow:\s*auto/);
    assert.match(styles, /\.map-size-33 \.strategy-map[\s\S]*width:\s*900px/);
    assert.match(styles, /\.map-size-33 \.strategy-map[\s\S]*height:\s*612px/);
    assert.match(styles, /touch-action:\s*pan-x pan-y/);
  });

  it('plays AI actions one at a time and announces battle log updates', () => {
    assert.match(appSource, /runAiRoundUntilPlayer/);
    assert.match(appSource, /await delay/);
    assert.match(appSource, /className: ['"]war-log['"].*'aria-live': ['"]polite['"]/s);
  });

  it('renders readable map playback from canonical city coordinates', () => {
    assert.match(mapSource, /playback\.command\.originCityId/);
    assert.match(mapSource, /playback\.command\.targetCityId/);
    assert.match(mapSource, /className: ['"]moving-troop['"]/);
    assert.match(mapSource, /className: `action-banner/);
    assert.match(mapSource, /className: ['"]city-delta/);
    assert.match(mapSource, /origin\.position\.x/);
    assert.match(mapSource, /target\.position\.x/);
  });

  it('includes readable outcomes and reduced-motion presentation', () => {
    assert.match(mapSource, /攻占|守住|增援完成/);
    assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(styles, /\.moving-troop/);
    assert.match(styles, /\.action-banner/);
    assert.match(styles, /\.reinforcement-node/);
  });

  it('stages player and AI actions and supports skipping AI waits', () => {
    assert.match(appSource, /createActionPlayback/);
    assert.match(appSource, /async function playAction/);
    assert.match(appSource, /setPlayback/);
    assert.match(appSource, /skipPlaybackRef\.current/);
    assert.match(appSource, /['"]skip-playback['"]/);
    assert.match(appSource, /reinforcingFaction/);
  });

  it('keeps travel timing, terminal results, reinforcement, and action colors readable', () => {
    assert.match(mapSource, /--travel-duration/);
    assert.match(styles, /animation-duration:\s*var\(--travel-duration/);
    assert.match(mapSource, /reinforcement-banner/);
    assert.match(mapSource, /城市自动增兵/);
    assert.match(styles, /\.playback-attack \.active-route/);
    assert.match(styles, /\.playback-transfer \.active-route/);
    assert.match(appSource, /game\.status !== 'playing' && !playback/);
  });

  it('marks city controls unavailable while an action is playing', () => {
    assert.match(appSource, /interactionLocked: busy/);
    assert.match(mapSource, /interactionLocked/);
    assert.match(mapSource, /tabIndex: isDisabled \? -1 : 0/);
  });

  it('contains only the approved lightweight rules and copy', () => {
    assert.match(appSource, /自动增兵/);
    assert.match(appSource, /每回合 2 次行动/);
    assert.match(appSource, /调兵/);
    assert.match(appSource, /进攻/);
    assert.doesNotMatch(appSource, /粮草|城防|武将|修城|征兵|军师|猛将|守将/);
  });

  it('publishes only the six lightweight game modules', async () => {
    const modules = (await readdir(new URL('../public/game/', import.meta.url))).sort();
    assert.deepEqual(modules, ['actions.js', 'ai-round.js', 'ai.js', 'playback.js', 'scenario.js', 'types.js']);
  });

  it('is self-contained, mobile ready, and importable after build', async () => {
    assert.match(html, /width=device-width/);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.doesNotMatch(appSource, /https?:\/\//);
    assert.doesNotMatch(mapSource, /https?:\/\//);
    const module = await import('../public/app.js');
    assert.equal(typeof module.App, 'function');
  });

  it('keeps the offline public payload below 15 MB', async () => {
    const files = [
      '../public/app.js',
      '../public/map-canvas.js',
      '../public/styles.css',
      '../public/assets/three-kingdoms-terrain.png',
      '../public/vendor/chunk-2N7SOW45.js',
      '../public/vendor/chunk-DLHEHLV2.js',
      '../public/vendor/react/esm-index-production.js',
      '../public/vendor/react-dom/esm-client-production.js',
    ];
    let total = 0;
    for (const file of files) total += (await stat(new URL(file, import.meta.url))).size;
    assert.ok(total < 15 * 1024 * 1024, `${total} bytes`);
  });
});
