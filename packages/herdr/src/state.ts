import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, win32 } from 'node:path';
import type { PluginState } from './types.js';

export const PLUGIN_ID = 'browserbase.browser';
const EMPTY_STATE: PluginState = { version: 1, workspaces: {} };

export function defaultStateDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): string {
  if (env.HERDR_PLUGIN_STATE_DIR) {
    return env.HERDR_PLUGIN_STATE_DIR;
  }
  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA
      ? env.LOCALAPPDATA
      : win32.join(
          env.USERPROFILE ?? env.HOME ?? homedir(),
          'AppData',
          'Local'
        );
    return win32.join(localAppData, 'herdr', 'plugins', PLUGIN_ID);
  }
  const stateHome = env.XDG_STATE_HOME
    ? env.XDG_STATE_HOME
    : join(env.HOME ?? homedir(), '.local', 'state');
  return join(stateHome, 'herdr', 'plugins', PLUGIN_ID);
}

export function statePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(defaultStateDir(env), 'browser-state.json');
}

export async function readState(path: string): Promise<PluginState> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as PluginState;
    if (parsed.version !== 1 || typeof parsed.workspaces !== 'object') {
      throw new Error(`Unsupported state format in ${path}`);
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return structuredClone(EMPTY_STATE);
    }
    throw error;
  }
}

async function writeState(path: string, state: PluginState): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, path);
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

export async function withStateLock<T>(
  path: string,
  update: (state: PluginState) => Promise<T> | T,
  options: { attempts?: number; retryMs?: number } = {}
): Promise<T> {
  return await withFileLock(
    `${path}.lock`,
    async () => {
      const state = await readState(path);
      const result = await update(state);
      await writeState(path, state);
      return result;
    },
    options
  );
}

export async function withFileLock<T>(
  lockPath: string,
  operation: () => Promise<T> | T,
  options: { attempts?: number; retryMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? 100;
  const retryMs = options.retryMs ?? 50;
  await mkdir(dirname(lockPath), { recursive: true, mode: 0o700 });

  let lock: Awaited<ReturnType<typeof open>> | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      lock = await open(lockPath, 'wx', 0o600);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await delay(retryMs);
    }
  }

  if (!lock) throw new Error(`Timed out waiting for state lock ${lockPath}`);

  try {
    return await operation();
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
