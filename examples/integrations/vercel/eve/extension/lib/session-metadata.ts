const INIT_ATTEMPT_METADATA_KEY = 'eveInitAttemptId';

export function createInitAttemptMetadata(
  initAttemptId: string
): Record<string, string> {
  return { [INIT_ATTEMPT_METADATA_KEY]: initAttemptId };
}

export function createInitAttemptQuery(initAttemptId: string): string {
  return `user_metadata['${INIT_ATTEMPT_METADATA_KEY}']:'${initAttemptId}'`;
}
