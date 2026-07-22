import { Stagehand } from '@browserbasehq/stagehand';

import extension from '../extension';
import { createBrowserbaseClient } from './browserbase';
import { disconnectStagehand } from './disconnect';
import {
  getRemoteSessionState,
  releaseBrowserbaseSession,
} from './release-session';
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

function createStagehand(): Stagehand {
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

      const sessions = createBrowserbaseClient().sessions;
      if ((await getRemoteSessionState(sessions, current.id)) !== 'terminal') {
        throw error;
      }

      browserSession.update(() => ({ id: null, url: null }));
    }
  }

  const created = createStagehand();
  try {
    await created.init();
  } catch (error) {
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

    const sessions = createBrowserbaseClient().sessions;
    if ((await getRemoteSessionState(sessions, current.id)) === 'terminal') {
      browserSession.update(() => ({ id: null, url: null }));
      return current;
    }

    await releaseBrowserbaseSession(sessions, current.id);

    browserSession.update(() => ({ id: null, url: null }));
    return current;
  });
}
