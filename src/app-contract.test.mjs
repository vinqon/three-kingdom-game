import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { describe, it } from 'node:test';

const appSource = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const mapSource = await readFile(new URL('../public/map-canvas.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
const heuristicPolicySource = await readFile(new URL('../public/game/heuristic-policy.js', import.meta.url), 'utf8');

describe('lightweight browser game contract', () => {
  it('exposes the complete lightweight interaction path', () => {
    const appTestIds = [
      'start-game',
      'confirm-faction',
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
    assert.match(appSource, /count:\s*12/);
    assert.match(appSource, /count:\s*18/);
    assert.match(appSource, /count:\s*24/);
    assert.match(appSource, /`map-size-\$\{size\.count\}`/);
    assert.match(appSource, /id:\s*['"]advantaged['"]/);
    assert.match(appSource, /id:\s*['"]fair['"]/);
    assert.match(appSource, /id:\s*['"]underdog['"]/);
    assert.match(appSource, /id:\s*['"]normal['"]/);
    assert.match(appSource, /id:\s*['"]expert['"]/);
    assert.match(appSource, /`opening-\$\{opening\.id\}`/);
    assert.match(appSource, /`opponent-\$\{opponent\.id\}`/);
    assert.match(appSource, /createLiteScenario\(initialFaction,\s*cityCount,\s*opening\)/);
    assert.match(appSource, /runAiRoundUntilPlayer\(game,[\s\S]*aiLevel/);
    assert.match(appSource, /wei:|shu:|wu:/);
    assert.match(mapSource, /['"]game-map['"]/);
    assert.match(mapSource, /`city-\$\{city\.id\}`/);
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

  it('cancels a pending command from invalid map clicks', () => {
    assert.match(appSource, /onCancelCommand/);
    assert.match(mapSource, /onCancelCommand/);
    assert.match(mapSource, /event\.stopPropagation/);
    assert.match(mapSource, /lockToLegalTargets && !interactionLocked/);
  });

  it('keeps iPad setup screens scrollable and compact', () => {
    assert.match(styles, /\.faction-screen[^{]*{[^}]*overflow-y:\s*auto/s);
    assert.match(styles, /-webkit-overflow-scrolling:\s*touch/);
    assert.match(styles, /@media \(min-width:\s*621px\) and \(max-width:\s*1180px\)/);
    assert.match(styles, /\.faction-select-card[^{]*{[^}]*max-height:\s*none/s);
  });

  it('keeps command actions out of the end-turn footer', () => {
    assert.match(appSource, /className: ['"]command-scroll['"]/);
    assert.match(appSource, /className: ['"]command-footer['"]/);
    assert.match(appSource, /commandScrollRef/);
    assert.match(appSource, /scrollTo/);
    assert.match(styles, /\.command-scroll/);
    assert.match(styles, /\.command-footer/);
    assert.doesNotMatch(styles, /\.end-turn-button\s*{[^}]*position:\s*absolute/s);
  });

  it('declares installable app icons for saved desktop apps', async () => {
    assert.match(html, /rel="manifest"/);
    assert.match(html, /apple-touch-icon/);
    const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.type === 'image/png'));
    assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.type === 'image/png'));
    for (const iconFile of [
      '../public/assets/app-icon-192.png',
      '../public/assets/app-icon-512.png',
      '../public/assets/apple-touch-icon.png',
    ]) {
      assert.ok((await stat(new URL(iconFile, import.meta.url))).size > 1000, iconFile);
    }
  });

  it('contains only the approved lightweight rules and copy', () => {
    assert.match(appSource, /自动增兵/);
    assert.match(appSource, /每回合 2 次行动/);
    assert.match(appSource, /调兵/);
    assert.match(appSource, /进攻/);
    assert.doesNotMatch(appSource, /粮草|城防|武将|修城|征兵|军师|猛将|守将/);
  });

  it('publishes only the approved lightweight game modules', async () => {
    const modules = (await readdir(new URL('../public/game/', import.meta.url))).sort();
    assert.deepEqual(modules, [
      'actions.js',
      'ai-round.js',
      'ai.js',
      'heuristic-policy.js',
      'playback.js',
      'policies.js',
      'scenario.js',
      'types.js',
    ]);
  });

  it('keeps advanced training policies out of the browser runtime', () => {
    assert.doesNotMatch(heuristicPolicySource, /createV2Policy/);
    assert.doesNotMatch(heuristicPolicySource, /capitalCaptureSetupAction/);
    assert.doesNotMatch(heuristicPolicySource, /suppressStrongestEnemyAction/);
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
