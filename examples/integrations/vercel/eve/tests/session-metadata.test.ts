import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitAttemptMetadata,
  createInitAttemptQuery,
} from '../extension/lib/session-metadata.ts';

test('uses one flat string field for failed-init session recovery', () => {
  const initAttemptId = 'attempt-123';

  assert.deepEqual(createInitAttemptMetadata(initAttemptId), {
    eveInitAttemptId: initAttemptId,
  });
  assert.equal(
    createInitAttemptQuery(initAttemptId),
    "user_metadata['eveInitAttemptId']:'attempt-123'"
  );
});
