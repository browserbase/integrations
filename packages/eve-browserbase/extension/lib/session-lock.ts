// Eve executes parallel tool calls from one model step in the same managed
// runtime. Durable state carries the session ID between later workflow steps;
// this lock only queues the parallel calls within the current step/runtime.
const sessionTailsSymbol = Symbol.for('@browserbasehq/eve.session-lock-tails');
// Eve emits one bundle per tool, but those bundles share this runtime global.
const sharedGlobal = globalThis as Record<symbol, unknown>;
const existingSessionTails = sharedGlobal[sessionTailsSymbol];
const sessionTails =
  existingSessionTails instanceof Map
    ? (existingSessionTails as Map<string, Promise<void>>)
    : new Map<string, Promise<void>>();
sharedGlobal[sessionTailsSymbol] = sessionTails;

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
