import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { beginFactionTurn } from './actions.ts';
import { runAiRoundUntilPlayer, type AiRoundEvent } from './ai-round.ts';
import { createLiteScenario } from './scenario.ts';

describe('observable AI round orchestration', () => {
  it('produces identical final state and log with delayed or skipped observers', async () => {
    const initial = beginFactionTurn(createLiteScenario('wei'));
    const normalEvents: AiRoundEvent[] = [];
    const skippedEvents: AiRoundEvent[] = [];

    const normal = await runAiRoundUntilPlayer(initial, async (event) => {
      normalEvents.push(event);
      await Promise.resolve();
    });
    const skipped = await runAiRoundUntilPlayer(structuredClone(initial), (event) => {
      skippedEvents.push(event);
    });

    assert.deepEqual(skipped, normal);
    assert.deepEqual(skipped.log, normal.log);
    assert.deepEqual(
      skippedEvents.map((event) => event.type),
      normalEvents.map((event) => event.type),
    );
    assert.equal(normal.turnFaction, normal.playerFaction);
  });

  it('reports only cities whose troops actually increased at turn start', async () => {
    const initial = beginFactionTurn(createLiteScenario('wei'));
    initial.cities.chengdu.troops = 8;
    initial.cities.hanzhong.troops = 6;
    initial.cities.yongan.troops = 3;
    initial.cities.jiangling.troops = 6;
    const events: AiRoundEvent[] = [];

    await runAiRoundUntilPlayer(initial, (event) => {
      events.push(event);
    });

    const firstTurn = events.find((event) => event.type === 'turn-start');
    assert.ok(firstTurn && firstTurn.type === 'turn-start');
    assert.equal(firstTurn.faction, 'shu');
    assert.deepEqual(firstTurn.reinforcedCityIds, ['yongan']);
  });
});
