const sessionTails = new Map<string, Promise<void>>();

export async function withSessionLock<T>(
  sessionId: string,
  operation: () => Promise<T>
): Promise<T> {
  const previous = sessionTails.get(sessionId) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>(resolve => {
    release = resolve;
  });

  sessionTails.set(sessionId, current);
  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (sessionTails.get(sessionId) === current) {
      sessionTails.delete(sessionId);
    }
  }
}
