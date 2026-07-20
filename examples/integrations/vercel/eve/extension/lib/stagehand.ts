import { Stagehand } from '@browserbasehq/stagehand';

import extension from '../extension';
import { browserSession, type BrowserSessionState } from './session-state';

type StagehandOperation<T> = (stagehand: Stagehand) => Promise<T>;

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

async function connect(): Promise<Stagehand> {
  const current = browserSession.get();

  if (current.id) {
    const resumed = resumeStagehand(current.id);
    try {
      await resumed.init();
      return resumed;
    } catch {
      browserSession.update(() => ({ id: null, url: null }));
    }
  }

  const created = createStagehand();
  await created.init();
  browserSession.update(() => ({
    id: created.browserbaseSessionID ?? null,
    url: created.browserbaseSessionURL ?? null,
  }));
  return created;
}

export async function withStagehand<T>(
  operation: StagehandOperation<T>
): Promise<T> {
  const stagehand = await connect();
  try {
    return await operation(stagehand);
  } finally {
    await stagehand.close();
  }
}

export async function createBrowserSession(): Promise<BrowserSessionState> {
  const stagehand = await connect();
  try {
    return browserSession.get();
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

  try {
    await stagehand.init();
    await stagehand.close();
  } finally {
    browserSession.update(() => ({ id: null, url: null }));
  }

  return current;
}
