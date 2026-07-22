import { APIError } from '@browserbasehq/sdk';

type BrowserbaseSessionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'ERROR'
  | 'TIMED_OUT'
  | 'COMPLETED';

interface BrowserbaseSessionRecord {
  status: BrowserbaseSessionStatus;
}

interface BrowserbaseSessionApi {
  retrieve(sessionId: string): Promise<BrowserbaseSessionRecord>;
  update(
    sessionId: string,
    body: { status: 'REQUEST_RELEASE' }
  ): Promise<BrowserbaseSessionRecord>;
}

export type RemoteSessionState = 'active' | 'terminal' | 'unknown';

const RELEASE_POLL_DELAYS_MS = [100, 250, 500, 1_000] as const;

function isActiveSessionStatus(
  status: BrowserbaseSessionStatus
): boolean {
  return status === 'PENDING' || status === 'RUNNING';
}

export async function getRemoteSessionState(
  sessions: Pick<BrowserbaseSessionApi, 'retrieve'>,
  sessionId: string
): Promise<RemoteSessionState> {
  try {
    const session = await sessions.retrieve(sessionId);
    return isActiveSessionStatus(session.status) ? 'active' : 'terminal';
  } catch (error) {
    return error instanceof APIError && error.status === 404
      ? 'terminal'
      : 'unknown';
  }
}

export async function releaseBrowserbaseSession(
  sessions: BrowserbaseSessionApi,
  sessionId: string,
  wait: (milliseconds: number) => Promise<void> = milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds))
): Promise<void> {
  try {
    const release = await sessions.update(sessionId, {
      status: 'REQUEST_RELEASE',
    });
    if (!isActiveSessionStatus(release.status)) return;
  } catch (error) {
    if (error instanceof APIError && error.status === 404) return;
    throw error;
  }

  for (const delay of RELEASE_POLL_DELAYS_MS) {
    await wait(delay);
    const state = await getRemoteSessionState(sessions, sessionId);
    if (state === 'terminal') return;
    if (state === 'unknown') {
      throw new Error(
        `Unable to confirm Browserbase session ${sessionId} was released.`
      );
    }
  }

  throw new Error(
    `Browserbase session ${sessionId} is still active after requesting release.`
  );
}
