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

type LiveStagehandConnection = Omit<StagehandConnection, 'created'>;

const liveConnectionsSymbol = Symbol.for(
  '@browserbasehq/eve.live-stagehand-connections'
);
// Eve emits one bundle per tool. Store live clients on the shared runtime
// global so create, navigate, and stop all see the same V4 initialization.
const sharedGlobal = globalThis as Record<symbol, unknown>;
const existingLiveConnections = sharedGlobal[liveConnectionsSymbol];
const liveConnections =
  existingLiveConnections instanceof Map
    ? (existingLiveConnections as Map<string, LiveStagehandConnection>)
    : new Map<string, LiveStagehandConnection>();
sharedGlobal[liveConnectionsSymbol] = liveConnections;

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
    keepAlive: false,
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
      const remoteState = await getRemoteSessionState(sessions, current.id);
      const alreadyInitialized =
        error instanceof Error &&
        error.message.includes('Stagehand has already been initialized');

      if (remoteState === 'active' && alreadyInitialized) {
        await releaseBrowserbaseSession(sessions, current.id);
      } else if (remoteState !== 'terminal') {
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

async function getLiveConnection(): Promise<StagehandConnection> {
  const current = browserSession.get();
  const live = current.id ? liveConnections.get(current.id) : undefined;

  if (
    live &&
    current.id === live.browser.sessionId &&
    live.stagehand.initialized &&
    !live.browser.closed
  ) {
    return { ...live, created: false };
  }

  if (live && current.id) {
    liveConnections.delete(current.id);
    await disconnectStagehand(live.stagehand, live.browser);
  }

  const connection = await connect();
  const remoteSessionId = connection.browser.sessionId;
  if (!remoteSessionId) {
    await disconnectStagehand(connection.stagehand, connection.browser);
    throw new Error('Browserbase did not return a session ID.');
  }

  liveConnections.set(remoteSessionId, {
    stagehand: connection.stagehand,
    browser: connection.browser,
  });
  return connection;
}

export async function withStagehand<T>(
  sessionId: string,
  operation: StagehandOperation<T>
): Promise<T> {
  return withSessionLock(sessionId, async () => {
    const { stagehand } = await getLiveConnection();
    return operation(stagehand);
  });
}

export async function createBrowserSession(
  sessionId: string
): Promise<BrowserSessionResult> {
  return withSessionLock(sessionId, async () => {
    const { created } = await getLiveConnection();
    return { ...browserSession.get(), created };
  });
}

export async function closeBrowserSession(
  sessionId: string
): Promise<BrowserSessionState> {
  return withSessionLock(sessionId, async () => {
    const current = browserSession.get();
    const live = current.id ? liveConnections.get(current.id) : undefined;
    if (live && current.id) {
      liveConnections.delete(current.id);
      await disconnectStagehand(live.stagehand, live.browser);
    }

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
