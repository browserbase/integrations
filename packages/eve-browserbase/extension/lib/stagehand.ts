import {
  browserbase,
  Stagehand,
  StagehandCreateOptionsSchema,
  type StagehandBrowser,
} from '@browserbasehq/stagehand';

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
  browser: StagehandBrowser;
  created: boolean;
}

export interface BrowserSessionResult extends BrowserSessionState {
  created: boolean;
}

function stagehandModel(modelName: string) {
  return StagehandCreateOptionsSchema.shape.model.parse({ modelName });
}

async function createStagehand(): Promise<StagehandConnection> {
  const { apiKey, model, proxies, sessionTimeoutSeconds } = extension.config;

  const browser = await browserbase.launch({
    apiKey,
    keepAlive: true,
    timeout: sessionTimeoutSeconds,
    proxies,
  });

  try {
    const stagehand = await Stagehand.create({
      browser,
      model: stagehandModel(model),
      logging: { level: 'off' },
    });
    return { stagehand, browser, created: true };
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
}

async function resumeStagehand(
  sessionId: string
): Promise<StagehandConnection> {
  const { apiKey, model } = extension.config;

  const browser = await browserbase.connect({
    apiKey,
    sessionId,
  });

  try {
    const stagehand = await Stagehand.create({
      browser,
      model: stagehandModel(model),
      logging: { level: 'off' },
    });
    return { stagehand, browser, created: false };
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
}

async function connect(): Promise<StagehandConnection> {
  const current = browserSession.get();

  if (current.id) {
    try {
      return await resumeStagehand(current.id);
    } catch (error) {
      const sessions = createBrowserbaseClient().sessions;
      if ((await getRemoteSessionState(sessions, current.id)) !== 'terminal') {
        throw error;
      }

      browserSession.update(() => ({ id: null, url: null }));
    }
  }

  const connection = await createStagehand();
  const sessionId = connection.browser.sessionId;
  if (!sessionId) {
    await disconnectStagehand(connection.stagehand, connection.browser);
    throw new Error('Browserbase did not return a session ID.');
  }

  browserSession.update(() => ({
    id: sessionId,
    url: `https://www.browserbase.com/sessions/${sessionId}`,
  }));
  return connection;
}

export async function withStagehand<T>(
  sessionId: string,
  operation: StagehandOperation<T>
): Promise<T> {
  return withSessionLock(sessionId, async () => {
    const { stagehand, browser } = await connect();
    try {
      return await operation(stagehand);
    } finally {
      await disconnectStagehand(stagehand, browser);
    }
  });
}

export async function createBrowserSession(
  sessionId: string
): Promise<BrowserSessionResult> {
  return withSessionLock(sessionId, async () => {
    const { stagehand, browser, created } = await connect();
    try {
      return { ...browserSession.get(), created };
    } finally {
      await disconnectStagehand(stagehand, browser);
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
