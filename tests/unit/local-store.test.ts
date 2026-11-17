import { preparationActions } from '../helpers/preparation';
import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { LocalStore } from '@/lib/local-store';
import { createMatch } from '@/domain/match';
import { defaultEquipment } from '@/domain/equipment';
import { templates } from '@/domain/templates';
it('restores local actions and pending queue after reopening, isolated per account', async () => {
  const user = crypto.randomUUID(),
    m = createMatch(
      {
        homeTeam: 'A',
        awayTeam: 'B',
        kickoffAt: '2026-12-01T14:00:00Z',
        practice: 'FOOT_11',
        timezone: 'Europe/Paris',
      },
      defaultEquipment(),
      templates.FOOT_11,
    );
  const store = new LocalStore(user);
  await store.putMatch(m);
  await store.dispatch(m.id, 'device-a', { type: 'BAG', itemId: 'watch', packed: true });
  const reopened = new LocalStore(user);
  expect((await reopened.matches())[0].bag.find((i) => i.id === 'watch')?.packed).toBe(true);
  expect(await reopened.pending()).toHaveLength(1);
  expect(await new LocalStore('other-' + user).matches()).toHaveLength(0);
});
it('acknowledges one operation without overwriting newer offline actions', async () => {
  const store = new LocalStore(crypto.randomUUID()),
    m = createMatch(
      {
        homeTeam: 'A',
        awayTeam: 'B',
        kickoffAt: '2026-12-01T14:00:00Z',
        practice: 'FOOT_11',
        timezone: 'Europe/Paris',
      },
      defaultEquipment(),
      templates.FOOT_11,
    );
  await store.putMatch(m);
  const first = await store.dispatch(m.id, 'device-a', {
    type: 'BAG',
    itemId: 'watch',
    packed: true,
  });
  await store.dispatch(m.id, 'device-a', { type: 'BAG', itemId: 'coin', packed: true });
  await store.acknowledge(first.operation.id, first.match);
  expect(await store.pending()).toHaveLength(1);
  expect((await store.matches())[0].bag.find((i) => i.id === 'coin')?.packed).toBe(true);
});
it('retains debrief patches across reload, server acknowledgement and account boundaries', async () => {
  const user = crypto.randomUUID(),
    store = new LocalStore(user);
  const match = createMatch(
    {
      homeTeam: 'A',
      awayTeam: 'B',
      kickoffAt: '2026-12-01T14:00:00Z',
      practice: 'FOOT_11',
      timezone: 'Europe/Paris',
    },
    [],
    templates.FOOT_11,
  );
  await store.putMatch(match);
  await store.dispatch(match.id, 'a', { type: 'START' });
  for (const action of preparationActions(match)) await store.dispatch(match.id, 'a', action);
  await store.dispatch(match.id, 'a', { type: 'KICKOFF', acknowledged: true });
  await store.dispatch(match.id, 'a', { type: 'FINISH_MATCH' });
  const first = await store.dispatch(match.id, 'b', {
    type: 'DEBRIEF',
    changes: { words: ['Calme', 'Juste', 'Clair'] },
  });
  await store.dispatch(match.id, 'b', { type: 'DEBRIEF', changes: { objective: 'Avantage' } });
  await store.acknowledge(first.operation.id, first.match);
  const reopened = new LocalStore(user),
    other = new LocalStore(crypto.randomUUID());
  expect((await reopened.matches())[0].debrief?.form).toMatchObject({
    words: ['Calme', 'Juste', 'Clair'],
    objective: 'Avantage',
  });
  expect((await reopened.pending()).at(-1)?.action.type).toBe('DEBRIEF');
  expect(await other.matches()).toEqual([]);
});
