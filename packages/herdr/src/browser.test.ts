import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BrowserController } from './browser.js';
import type { CommandRunner } from './types.js';

const identity = {
  workspaceId: 'workspace-1',
  actorId: 'codex',
  browseSession: 'herdr-workspace-1-codex',
};

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'herdr-browser-test-'));
  return join(directory, 'state.json');
}

describe('BrowserController', () => {
  it('opens localhost without cloud credentials', async () => {
    const calls: string[][] = [];
    const run: CommandRunner = async args => {
      calls.push(args);
      return { status: 0, stdout: '', stderr: '' };
    };
    const controller = new BrowserController({
      identity,
      path: await fixture(),
      run,
      env: {},
    });
    await controller.open('http://localhost:3000');
    expect(calls[0]).toEqual([
      'open',
      'http://localhost:3000',
      '--local',
      '--session',
      identity.browseSession,
    ]);
  });

  it('creates and reuses a workspace context', async () => {
    const path = await fixture();
    const calls: string[][] = [];
    let session = 0;
    const run: CommandRunner = async args => {
      calls.push(args);
      if (args.slice(0, 3).join(' ') === 'cloud contexts create') {
        return { status: 0, stdout: '{"id":"ctx_1"}', stderr: '' };
      }
      if (args.slice(0, 3).join(' ') === 'cloud sessions create') {
        session += 1;
        return {
          status: 0,
          stdout: JSON.stringify({
            id: `sess_${session}`,
            connectUrl: `wss://example/${session}`,
          }),
          stderr: '',
        };
      }
      return { status: 0, stdout: '', stderr: '' };
    };
    const controller = new BrowserController({
      identity,
      path,
      run,
      env: { BROWSERBASE_API_KEY: 'secret-value' },
    });
    await controller.open('https://example.com');
    await controller.stop();
    await controller.open('https://example.org');

    expect(
      calls.filter(
        args => args.slice(0, 3).join(' ') === 'cloud contexts create'
      )
    ).toHaveLength(1);
    expect(await readFile(path, 'utf8')).not.toContain('secret-value');
  });

  it('releases a cloud session even when daemon stop fails', async () => {
    const path = await fixture();
    const calls: string[][] = [];
    const run: CommandRunner = async args => {
      calls.push(args);
      if (args.slice(0, 3).join(' ') === 'cloud contexts create') {
        return { status: 0, stdout: '{"id":"ctx_1"}', stderr: '' };
      }
      if (args.slice(0, 3).join(' ') === 'cloud sessions create') {
        return {
          status: 0,
          stdout: '{"id":"sess_1","connectUrl":"wss://example"}',
          stderr: '',
        };
      }
      if (args[0] === 'stop') return { status: 2, stdout: '', stderr: '' };
      return { status: 0, stdout: '', stderr: '' };
    };
    const controller = new BrowserController({
      identity,
      path,
      run,
      env: { BROWSERBASE_API_KEY: 'secret' },
    });
    await controller.open('https://example.com');
    expect(await controller.stop()).toBe(2);
    expect(calls).toContainEqual([
      'cloud',
      'sessions',
      'update',
      'sess_1',
      '--status',
      'REQUEST_RELEASE',
    ]);
  });

  it('rejects cloud mode without an API key', async () => {
    const controller = new BrowserController({
      identity,
      path: await fixture(),
      run: async () => ({ status: 0, stdout: '', stderr: '' }),
      env: {},
    });
    await expect(controller.open('https://example.com')).rejects.toThrow(
      'BROWSERBASE_API_KEY'
    );
  });

  it('keeps workspace contexts separate', async () => {
    const path = await fixture();
    let contextNumber = 0;
    const sessionContextIds: string[] = [];
    const run: CommandRunner = async args => {
      if (args.slice(0, 3).join(' ') === 'cloud contexts create') {
        contextNumber += 1;
        return {
          status: 0,
          stdout: JSON.stringify({ id: `ctx_${contextNumber}` }),
          stderr: '',
        };
      }
      if (args.slice(0, 3).join(' ') === 'cloud sessions create') {
        sessionContextIds.push(args[4] ?? '');
        return {
          status: 0,
          stdout: JSON.stringify({
            id: `sess_${sessionContextIds.length}`,
            connectUrl: `wss://example/${sessionContextIds.length}`,
          }),
          stderr: '',
        };
      }
      return { status: 0, stdout: '', stderr: '' };
    };
    const first = new BrowserController({
      identity,
      path,
      run,
      env: { BROWSERBASE_API_KEY: 'secret' },
    });
    const second = new BrowserController({
      identity: {
        workspaceId: 'workspace-2',
        actorId: 'codex',
        browseSession: 'herdr-workspace-2-codex',
      },
      path,
      run,
      env: { BROWSERBASE_API_KEY: 'secret' },
    });
    await first.open('https://example.com');
    await second.open('https://example.com');
    expect(sessionContextIds).toEqual(['ctx_1', 'ctx_2']);
  });

  it('deletes all workspace sessions and its context on reset', async () => {
    const path = await fixture();
    const calls: string[][] = [];
    const run: CommandRunner = async args => {
      calls.push(args);
      if (args.slice(0, 3).join(' ') === 'cloud contexts create') {
        return { status: 0, stdout: '{"id":"ctx_1"}', stderr: '' };
      }
      if (args.slice(0, 3).join(' ') === 'cloud sessions create') {
        return {
          status: 0,
          stdout: '{"id":"sess_1","connectUrl":"wss://example"}',
          stderr: '',
        };
      }
      return { status: 0, stdout: '', stderr: '' };
    };
    const controller = new BrowserController({
      identity,
      path,
      run,
      env: { BROWSERBASE_API_KEY: 'secret' },
    });
    await controller.open('https://example.com');
    expect(await controller.reset()).toBe(0);
    expect(calls).toContainEqual(['cloud', 'contexts', 'delete', 'ctx_1']);
    expect(await readFile(path, 'utf8')).not.toContain('workspace-1');
  });

  it('does not allow a new session to race with workspace reset', async () => {
    const path = await fixture();
    let contextNumber = 0;
    let sessionNumber = 0;
    let releaseReset: (() => void) | undefined;
    let markResetReachedRelease: (() => void) | undefined;
    const resetReachedRelease = new Promise<void>(resolve => {
      markResetReachedRelease = resolve;
    });
    const holdResetRelease = new Promise<void>(resolve => {
      releaseReset = resolve;
    });
    const run: CommandRunner = async args => {
      if (args.slice(0, 3).join(' ') === 'cloud contexts create') {
        contextNumber += 1;
        return {
          status: 0,
          stdout: JSON.stringify({ id: `ctx_${contextNumber}` }),
          stderr: '',
        };
      }
      if (args.slice(0, 3).join(' ') === 'cloud sessions create') {
        sessionNumber += 1;
        return {
          status: 0,
          stdout: JSON.stringify({
            id: `sess_${sessionNumber}`,
            connectUrl: `wss://example/${sessionNumber}`,
          }),
          stderr: '',
        };
      }
      if (
        args.slice(0, 3).join(' ') === 'cloud sessions update' &&
        args[3] === 'sess_1'
      ) {
        markResetReachedRelease?.();
        await holdResetRelease;
      }
      return { status: 0, stdout: '', stderr: '' };
    };
    const resetter = new BrowserController({
      identity,
      path,
      run,
      env: { BROWSERBASE_API_KEY: 'secret' },
    });
    const concurrentAgent = new BrowserController({
      identity: {
        ...identity,
        actorId: 'claude',
        browseSession: 'herdr-workspace-1-claude',
      },
      path,
      run,
      env: { BROWSERBASE_API_KEY: 'secret' },
    });

    await resetter.open('https://example.com');
    const resetting = resetter.reset();
    await resetReachedRelease;
    const opening = concurrentAgent.open('https://example.org');
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(contextNumber).toBe(1);
    expect(sessionNumber).toBe(1);

    releaseReset?.();
    await resetting;
    await opening;
    expect(contextNumber).toBe(2);
    expect(sessionNumber).toBe(2);
    const state = JSON.parse(await readFile(path, 'utf8')) as {
      workspaces: Record<string, { sessions: Record<string, unknown> }>;
    };
    expect(state.workspaces['workspace-1']?.sessions).toHaveProperty('claude');
  });
});
