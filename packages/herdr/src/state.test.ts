import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  defaultStateDir,
  readState,
  statePath,
  withStateLock,
} from './state.js';

describe('state locking', () => {
  it('serializes concurrent updates', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'herdr-state-test-'));
    const path = join(directory, 'state.json');
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        withStateLock(path, state => {
          state.workspaces[`workspace-${index}`] = { sessions: {} };
        })
      )
    );
    expect(Object.keys((await readState(path)).workspaces)).toHaveLength(8);
  });
});

describe('statePath', () => {
  it('uses HERDR_PLUGIN_STATE_DIR when present', () => {
    expect(
      defaultStateDir({ HERDR_PLUGIN_STATE_DIR: '/custom/state/dir' })
    ).toBe('/custom/state/dir');
    expect(statePath({ HERDR_PLUGIN_STATE_DIR: '/custom/state/dir' })).toBe(
      '/custom/state/dir/browser-state.json'
    );
  });

  it('defaults to XDG_STATE_HOME on unix platforms', () => {
    expect(
      defaultStateDir({ XDG_STATE_HOME: '/custom/xdg/state' }, 'linux')
    ).toBe('/custom/xdg/state/herdr/plugins/browserbase.browser');
  });

  it('defaults to ~/.local/state on unix platforms when XDG_STATE_HOME is unset', () => {
    expect(defaultStateDir({ HOME: '/home/test' }, 'linux')).toBe(
      join(
        '/home/test',
        '.local',
        'state',
        'herdr',
        'plugins',
        'browserbase.browser'
      )
    );
  });

  it('defaults to LOCALAPPDATA on win32', () => {
    expect(
      defaultStateDir(
        { LOCALAPPDATA: 'C:\\Users\\test\\AppData\\Local' },
        'win32'
      )
    ).toBe(
      'C:\\Users\\test\\AppData\\Local\\herdr\\plugins\\browserbase.browser'
    );
  });

  it('falls back to USERPROFILE on win32', () => {
    expect(defaultStateDir({ USERPROFILE: 'C:\\Users\\test' }, 'win32')).toBe(
      'C:\\Users\\test\\AppData\\Local\\herdr\\plugins\\browserbase.browser'
    );
  });
});
