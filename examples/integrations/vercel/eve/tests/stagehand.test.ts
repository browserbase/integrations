import assert from 'node:assert/strict';
import test from 'node:test';

import { disconnectStagehand } from '../extension/lib/disconnect.ts';

test('does not surface a Stagehand disconnect failure', async () => {
  await assert.doesNotReject(
    disconnectStagehand({
      async close() {
        throw new Error('disconnect failed');
      },
    })
  );
});
