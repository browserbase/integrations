import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type BrowserbaseSessionApi,
  releaseBrowserbaseSession,
} from '../extension/lib/release-session.ts';

function sessionApi(options: {
  retrieve: BrowserbaseSessionApi['retrieve'];
  update: BrowserbaseSessionApi['update'];
}): BrowserbaseSessionApi {
  return options;
}

test('requests release and waits for a terminal Browserbase session', async () => {
  const updates: string[] = [];
  const waits: number[] = [];
  let retrievals = 0;
  const sessions = sessionApi({
    async update(sessionId, body) {
      assert.deepEqual(body, { status: 'REQUEST_RELEASE' });
      updates.push(sessionId);
      return { status: 'RUNNING' };
    },
    async retrieve() {
      retrievals += 1;
      return { status: retrievals === 1 ? 'RUNNING' : 'COMPLETED' };
    },
  });

  await releaseBrowserbaseSession(sessions, 'session-123', async milliseconds => {
    waits.push(milliseconds);
  });

  assert.deepEqual(updates, ['session-123']);
  assert.deepEqual(waits, [100, 250]);
});

test('does not report success while the Browserbase session remains active', async () => {
  const sessions = sessionApi({
    async update() {
      return { status: 'RUNNING' };
    },
    async retrieve() {
      return { status: 'RUNNING' };
    },
  });

  await assert.rejects(
    releaseBrowserbaseSession(sessions, 'session-123', async () => {}),
    /still active/
  );
});
