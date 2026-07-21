import { randomUUID } from 'node:crypto';

import { Stagehand } from '@browserbasehq/stagehand';
import { APIError } from '@browserbasehq/sdk';

import extension from '../extension';
import { createBrowserbaseClient } from './browserbase';
import { disconnectStagehand } from './disconnect';
import { withSessionLock } from './session-lock';
import { browserSession, type BrowserSessionState } from './session-state';

type StagehandOperation<T> = (stagehand: Stagehand) => Promise<T>;

interface StagehandConnection {
  stagehand: Stagehand;
  created: boolean;
}

export interface BrowserSessionResult extends BrowserSessionState {
  created: boolean;
}

type RemoteSessionState = 'active' | 'terminal' | 'unknown';
const ACTIVE_SESSION_STATUSES = new Set(['PENDING', 'RUNNING']);

function browserbaseSessionUrl(sessionId: string): string {
  return `https://www.browserbase.com/sessions/${sessionId}`;
}

async function getRemoteSessionState(
  sessionId: string
): Promise<RemoteSessionState> {
  try {
    const session = await createBrowserbaseClient().sessions.retrieve(sessionId);
    return ACTIVE_SESSION_STATUSES.has(session.status)
      ? 'active'
      : 'terminal';
  } catch (error) {
    return error instanceof APIError && error.status === 404
      ? 'terminal'
      : 'unknown';
  }
}

async function persistPartiallyCreatedSession(
  initAttemptId: string
): Promise<void> {
  try {
    const sessions = await createBrowserbaseClient().sessions.list({
      q: `user_metadata['eve']['initAttemptId']:'${initAttemptId}'`,
    });
    const active = sessions.find(session =>
      ACTIVE_SESSION_STATUSES.has(session.status)
    );
    if (!active) return;

    browserSession.update(() => ({
      id: active.id,
      url: browserbaseSessionUrl(active.id),
    }));
  } catch {
    // Preserve the original Stagehand init error. The attempt metadata remains
    // attached in Browserbase for diagnosis if recovery itself is unavailable.
  }
}

function createStagehand(initAttemptId: string): Stagehand {
  const { apiKey, model, proxies, sessionTimeoutSeconds } = extension.config;

  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey,
    model,
    disablePino: true,
    keepAlive: true,
    browserbaseSessionCreateParams: {
      keepAlive: true,
      timeout: sessionTimeoutSeconds,
      proxies,
      userMetadata: {
        eve: { initAttemptId },
      },
    },
  });
}

function resumeStagehand(sessionId: string): Stagehand {
  const { apiKey, model } = extension.config;

  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey,
    model,
    disablePino: true,
    keepAlive: true,
    browserbaseSessionID: sessionId,
  });
}

async function connect(): Promise<StagehandConnection> {
  const current = browserSession.get();

  if (current.id) {
    const resumed = resumeStagehand(current.id);
    try {
      await resumed.init();
      return { stagehand: resumed, created: false };
    } catch (error) {
      await disconnectStagehand(resumed);

      if ((await getRemoteSessionState(current.id)) !== 'terminal') {
        throw error;
      }

      browserSession.update(() => ({ id: null, url: null }));
    }
  }

  const initAttemptId = randomUUID();
  const created = createStagehand(initAttemptId);
  try {
    await created.init();
  } catch (error) {
    await persistPartiallyCreatedSession(initAttemptId);
    await disconnectStagehand(created);
    throw error;
  }
  browserSession.update(() => ({
    id: created.browserbaseSessionID ?? null,
    url: created.browserbaseSessionURL ?? null,
  }));
  return { stagehand: created, created: true };
}

export async function withStagehand<T>(
  sessionId: string,
  operation: StagehandOperation<T>
): Promise<T> {
  return withSessionLock(sessionId, async () => {
    const { stagehand } = await connect();
    try {
      return await operation(stagehand);
    } finally {
      await disconnectStagehand(stagehand);
    }
  });
}

export async function createBrowserSession(
  sessionId: string
): Promise<BrowserSessionResult> {
  return withSessionLock(sessionId, async () => {
    const { stagehand, created } = await connect();
    try {
      return { ...browserSession.get(), created };
    } finally {
      await disconnectStagehand(stagehand);
    }
  });
}

export async function closeBrowserSession(
  sessionId: string
): Promise<BrowserSessionState> {
  return withSessionLock(sessionId, async () => {
    const current = browserSession.get();
    if (!current.id) return current;

    if ((await getRemoteSessionState(current.id)) === 'terminal') {
      browserSession.update(() => ({ id: null, url: null }));
      return current;
    }

    const stagehand = new Stagehand({
      env: 'BROWSERBASE',
      apiKey: extension.config.apiKey,
      browserbaseSessionID: current.id,
      disablePino: true,
      // Eve bundles Stagehand without its CLI-only crash supervisor entrypoint.
      // This path closes the session explicitly, so supervisor logging is not useful.
      logger: () => {},
      keepAlive: false,
    });

    try {
      await stagehand.init();
      await stagehand.close();
    } catch (error) {
      if ((await getRemoteSessionState(current.id)) !== 'terminal') {
        throw error;
      }
    }

    browserSession.update(() => ({ id: null, url: null }));
    return current;
  });
}
