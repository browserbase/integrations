import assert from 'node:assert/strict';
import test from 'node:test';

import { withSessionLock } from '../extension/lib/session-lock.ts';

test('serializes operations within one Eve session', async () => {
  const events: string[] = [];
  let releaseFirst = () => {};
  const firstBlocked = new Promise<void>(resolve => {
    releaseFirst = resolve;
  });

  const first = withSessionLock('session-a', async () => {
    events.push('first:start');
    await firstBlocked;
    events.push('first:end');
  });
  const second = withSessionLock('session-a', async () => {
    events.push('second:start');
    events.push('second:end');
  });

  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['first:start']);

  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, [
    'first:start',
    'first:end',
    'second:start',
    'second:end',
  ]);
});

test('does not serialize operations from different Eve sessions', async () => {
  const started: string[] = [];
  let release = () => {};
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });

  const first = withSessionLock('session-a', async () => {
    started.push('session-a');
    await blocked;
  });
  const second = withSessionLock('session-b', async () => {
    started.push('session-b');
    await blocked;
  });

  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(started.sort(), ['session-a', 'session-b']);

  release();
  await Promise.all([first, second]);
});

test('releases a session lock when an operation fails', async () => {
  await assert.rejects(
    withSessionLock('session-a', async () => {
      throw new Error('expected failure');
    }),
    /expected failure/
  );

  const result = await withSessionLock('session-a', async () => 'recovered');
  assert.equal(result, 'recovered');
});
