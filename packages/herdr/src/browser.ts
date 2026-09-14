import { createHash } from 'node:crypto';
import type { HerdrIdentity } from './identity.js';
import { selectMode } from './identity.js';
import { parseJsonOutput } from './runner.js';
import { readState, withFileLock, withStateLock } from './state.js';
import type {
  BrowserMode,
  CommandResult,
  CommandRunner,
  SessionState,
} from './types.js';

interface CloudContextResponse {
  id: string;
}

interface CloudSessionResponse {
  id: string;
  connectUrl: string;
}

export interface BrowserControllerOptions {
  identity: HerdrIdentity;
  path: string;
  run: CommandRunner;
  env?: NodeJS.ProcessEnv;
}

export class BrowserController {
  private readonly identity: HerdrIdentity;
  private readonly path: string;
  private readonly run: CommandRunner;
  private readonly env: NodeJS.ProcessEnv;

  constructor(options: BrowserControllerOptions) {
    this.identity = options.identity;
    this.path = options.path;
    this.run = options.run;
    this.env = options.env ?? process.env;
  }

  async open(url: string, override?: BrowserMode): Promise<CommandResult> {
    return await this.withLifecycleLock(() => this.openUnlocked(url, override));
  }

  private async openUnlocked(
    url: string,
    override?: BrowserMode
  ): Promise<CommandResult> {
    const mode = selectMode(url, override);
    if (mode === 'local') {
      const result = await this.run([
        'open',
        url,
        '--local',
        '--session',
        this.identity.browseSession,
      ]);
      if (result.status === 0) {
        await this.saveSession({
          browseSession: this.identity.browseSession,
          mode,
        });
      }
      return result;
    }

    if (!this.env.BROWSERBASE_API_KEY) {
      throw new Error(
        'BROWSERBASE_API_KEY is required for cloud URLs. Set it in the environment or pass --local.'
      );
    }

    const existing = await this.currentSession();
    if (existing?.mode === 'cloud' && existing.browserbaseSessionId) {
      const resumed = await this.run([
        'open',
        url,
        '--session',
        this.identity.browseSession,
      ]);
      if (resumed.status === 0) return resumed;
      await this.release(existing.browserbaseSessionId);
    }

    const contextId = await this.contextId();
    const cloudSession = parseJsonOutput<CloudSessionResponse>(
      await this.run(
        [
          'cloud',
          'sessions',
          'create',
          '--context-id',
          contextId,
          '--persist',
          '--keep-alive',
        ],
        { capture: true }
      )
    );
    if (!cloudSession.id || !cloudSession.connectUrl) {
      throw new Error(
        'browse cloud session response is missing id or connectUrl'
      );
    }

    const session: SessionState = {
      browseSession: this.identity.browseSession,
      browserbaseSessionId: cloudSession.id,
      mode,
    };
    await this.saveSession(session);
    const opened = await this.run([
      'open',
      url,
      '--cdp',
      cloudSession.connectUrl,
      '--session',
      this.identity.browseSession,
    ]);
    if (opened.status !== 0) {
      await this.release(cloudSession.id);
      await this.removeSession();
    }
    return opened;
  }

  async delegate(args: string[]): Promise<CommandResult> {
    return await this.run([...args, '--session', this.identity.browseSession]);
  }

  async status(): Promise<{
    workspaceId: string;
    actorId: string;
    contextId?: string;
    session?: SessionState;
    browse: CommandResult;
  }> {
    const state = await readState(this.path);
    const workspace = state.workspaces[this.identity.workspaceId];
    return {
      workspaceId: this.identity.workspaceId,
      actorId: this.identity.actorId,
      contextId: workspace?.contextId,
      session: workspace?.sessions[this.identity.actorId],
      browse: await this.run(
        ['status', '--session', this.identity.browseSession],
        { capture: true }
      ),
    };
  }

  async stop(): Promise<number> {
    return await this.withLifecycleLock(() => this.stopUnlocked());
  }

  private async stopUnlocked(): Promise<number> {
    const session = await this.currentSession();
    const stopped = await this.run([
      'stop',
      '--session',
      this.identity.browseSession,
    ]);
    let releaseStatus = 0;
    if (session?.browserbaseSessionId) {
      releaseStatus = (await this.release(session.browserbaseSessionId)).status;
    }
    await this.removeSession();
    return stopped.status || releaseStatus;
  }

  async reset(): Promise<number> {
    return await this.withLifecycleLock(() => this.resetUnlocked());
  }

  private async resetUnlocked(): Promise<number> {
    const state = await readState(this.path);
    const workspace = state.workspaces[this.identity.workspaceId];
    let status = 0;
    for (const session of Object.values(workspace?.sessions ?? {})) {
      const stopped = await this.run([
        'stop',
        '--session',
        session.browseSession,
      ]);
      status ||= stopped.status;
      if (session.browserbaseSessionId) {
        const released = await this.release(session.browserbaseSessionId);
        status ||= released.status;
      }
    }
    if (workspace?.contextId) {
      const deleted = await this.run([
        'cloud',
        'contexts',
        'delete',
        workspace.contextId,
      ]);
      status ||= deleted.status;
    }
    await withStateLock(this.path, lockedState => {
      delete lockedState.workspaces[this.identity.workspaceId];
    });
    return status;
  }

  private async contextId(): Promise<string> {
    return await withStateLock(this.path, async state => {
      const workspace = (state.workspaces[this.identity.workspaceId] ??= {
        sessions: {},
      });
      if (workspace.contextId) return workspace.contextId;
      const context = parseJsonOutput<CloudContextResponse>(
        await this.run(['cloud', 'contexts', 'create'], { capture: true })
      );
      if (!context.id) throw new Error('browse context response is missing id');
      workspace.contextId = context.id;
      return context.id;
    });
  }

  private async currentSession(): Promise<SessionState | undefined> {
    const state = await readState(this.path);
    return state.workspaces[this.identity.workspaceId]?.sessions[
      this.identity.actorId
    ];
  }

  private async saveSession(session: SessionState): Promise<void> {
    await withStateLock(this.path, state => {
      const workspace = (state.workspaces[this.identity.workspaceId] ??= {
        sessions: {},
      });
      workspace.sessions[this.identity.actorId] = session;
    });
  }

  private async removeSession(): Promise<void> {
    await withStateLock(this.path, state => {
      const workspace = state.workspaces[this.identity.workspaceId];
      if (workspace) delete workspace.sessions[this.identity.actorId];
    });
  }

  private async release(sessionId: string): Promise<CommandResult> {
    return await this.run([
      'cloud',
      'sessions',
      'update',
      sessionId,
      '--status',
      'REQUEST_RELEASE',
    ]);
  }

  private async withLifecycleLock<T>(operation: () => Promise<T>): Promise<T> {
    const workspaceHash = createHash('sha256')
      .update(this.identity.workspaceId)
      .digest('hex')
      .slice(0, 16);
    return await withFileLock(
      `${this.path}.workspace-${workspaceHash}.lock`,
      operation,
      { attempts: 2400, retryMs: 50 }
    );
  }
}
