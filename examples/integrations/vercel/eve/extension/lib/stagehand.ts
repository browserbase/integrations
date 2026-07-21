import { Stagehand } from '@browserbasehq/stagehand';

import extension from '../extension';
import { createBrowserbaseClient } from './browserbase';
import { browserSession, type BrowserSessionState } from './session-state';

type StagehandOperation<T> = (stagehand: Stagehand) => Promise<T>;

interface StagehandConnection {
  stagehand: Stagehand;
  created: boolean;
}

export interface BrowserSessionResult extends BrowserSessionState {
  created: boolean;
}

async function isTerminalBrowserSession(sessionId: string): Promise<boolean> {
  try {
    const session = await createBrowserbaseClient().sessions.retrieve(sessionId);
    return !['PENDING', 'RUNNING'].includes(session.status);
  } catch {
    // A failed status check may be transient. Preserve the durable session id so
    // the next tool call can retry instead of leaking a keep-alive session.
    return false;
  }
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
      await resumed.close().catch(() => {});

      if (!(await isTerminalBrowserSession(current.id))) {
        throw error;
      }

      browserSession.update(() => ({ id: null, url: null }));
    }
  }

  const created = createStagehand();
  await created.init();
  browserSession.update(() => ({
    id: created.browserbaseSessionID ?? null,
    url: created.browserbaseSessionURL ?? null,
  }));
  return { stagehand: created, created: true };
}

export async function withStagehand<T>(
  operation: StagehandOperation<T>
): Promise<T> {
  const { stagehand } = await connect();
  try {
    return await operation(stagehand);
  } finally {
    await stagehand.close();
  }
}

export async function createBrowserSession(): Promise<BrowserSessionResult> {
  const { stagehand, created } = await connect();
  try {
    return { ...browserSession.get(), created };
  } finally {
    await stagehand.close();
  }
}

export async function closeBrowserSession(): Promise<BrowserSessionState> {
  const current = browserSession.get();
  if (!current.id) return current;

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

  await stagehand.init();
  await stagehand.close();
  browserSession.update(() => ({ id: null, url: null }));

  return current;
}
