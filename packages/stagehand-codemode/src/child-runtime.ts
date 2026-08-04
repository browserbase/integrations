import { fork, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Browserbase from '@browserbasehq/sdk';
import type { ChildRequest, ChildResponse } from './runtime-protocol.js';
import type {
  CodeRuntime,
  RuntimeRunResult,
  StagehandCodeRuntimeConfig,
} from './types.js';
import { CodeModeRuntimeError } from './types.js';

type ChildRequestWithoutId = ChildRequest extends infer Request
  ? Request extends { id: string }
    ? Omit<Request, 'id'>
    : never
  : never;

type PendingRequest = {
  resolve(value: unknown): void;
  reject(error: Error): void;
};

type RequestControl = {
  hardTimeoutMs?: number;
  terminateOnAbort?: boolean;
  timeoutError?: () => CodeModeRuntimeError;
};

export type StagehandChildRuntimeOptions = {
  childModuleUrl?: URL;
};

const CHILD_EXIT_GRACE_MS = 2_000;
const PARENT_WATCHDOG_GRACE_MS = 250;
const CONFIGURE_TIMEOUT_MS = 10_000;
const RELEASE_SWEEP_DELAYS_MS = [0, 500, 1_500] as const;
const CHILD_ENV_KEYS = [
  'PATH',
  'NODE_PATH',
  'TMPDIR',
  'TEMP',
  'TMP',
  'NODE_EXTRA_CA_CERTS',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'NO_COLOR',
  'TZ',
] as const;

export class StagehandChildRuntime implements CodeRuntime {
  private child?: ChildProcess;
  private configurePromise?: Promise<void>;
  private readonly pending = new Map<string, PendingRequest>();
  private closePromise?: Promise<void>;
  private forceTerminationPromise?: Promise<void>;
  private releasePromise?: Promise<void>;
  private closed = false;
  private readonly runtimeTag = randomUUID();

  constructor(
    private readonly config: StagehandCodeRuntimeConfig,
    private readonly options: StagehandChildRuntimeOptions = {}
  ) {}

  async run(
    code: string,
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<RuntimeRunResult> {
    await this.ensureConfigured(signal);
    return (await this.request(
      { type: 'run', code, timeoutMs },
      signal,
      false,
      {
        hardTimeoutMs: timeoutMs + PARENT_WATCHDOG_GRACE_MS,
        terminateOnAbort: true,
        timeoutError: () =>
          new CodeModeRuntimeError(
            'timeout',
            `Code execution exceeded ${timeoutMs}ms.`,
            true,
            {
              mayHaveSideEffects: true,
              browserStateLost: true,
            }
          ),
      }
    )) as RuntimeRunResult;
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.forceTerminationPromise;
    const child = this.child;
    if (!child) return;
    let acknowledged = false;
    try {
      if (child.connected) {
        await this.request({ type: 'close' }, undefined, true, {
          hardTimeoutMs: CHILD_EXIT_GRACE_MS,
          timeoutError: () =>
            new CodeModeRuntimeError(
              'runtime',
              'Stagehand child did not acknowledge close.'
            ),
        });
        acknowledged = true;
      }
    } catch {
      // The child may already have exited; cleanup continues below.
    } finally {
      await terminateChild(child, 'SIGTERM');
      if (!acknowledged) await this.releaseBrowserbaseSessions();
      if (this.child === child) this.child = undefined;
    }
  }

  private async ensureConfigured(signal?: AbortSignal): Promise<void> {
    await this.forceTerminationPromise;
    if (this.closed)
      throw new CodeModeRuntimeError('closed', 'Code executor is closed.');
    if (!this.configurePromise) {
      const configuring = (async () => {
        this.spawnChild();
        await this.request(
          {
            type: 'configure',
            runtimeTag: this.runtimeTag,
            config: this.config,
          },
          signal,
          false,
          {
            hardTimeoutMs: CONFIGURE_TIMEOUT_MS,
            terminateOnAbort: true,
            timeoutError: () =>
              new CodeModeRuntimeError(
                'runtime',
                'Stagehand child configuration timed out.',
                true,
                {
                  browserStateLost: true,
                }
              ),
          }
        );
      })();
      this.configurePromise = configuring;
      void configuring.catch(() => {
        if (this.configurePromise === configuring)
          this.configurePromise = undefined;
      });
    }
    await this.configurePromise;
  }

  private spawnChild(): void {
    if (this.child) return;
    this.forceTerminationPromise = undefined;
    const modulePath = fileURLToPath(
      this.options.childModuleUrl ??
        new URL('./runtime-child.js', import.meta.url)
    );
    const child = fork(modulePath, [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      execArgv: [],
      env: childEnvironment(process.env),
    });
    this.child = child;
    child.stdout?.on('data', chunk =>
      process.stderr.write(`[codemode child] ${chunk}`)
    );
    child.stderr?.on('data', chunk =>
      process.stderr.write(`[codemode child] ${chunk}`)
    );
    child.on('message', message => this.handleMessage(message));
    child.once('exit', (code, signal) => {
      const pending = [...this.pending.values()];
      this.pending.clear();
      if (this.child === child) {
        this.child = undefined;
        if (!this.closed) this.configurePromise = undefined;
      }
      const error = new CodeModeRuntimeError(
        'runtime',
        `Stagehand child exited${signal ? ` with signal ${signal}` : ` with code ${code}`}.`,
        true,
        { mayHaveSideEffects: true, browserStateLost: true }
      );
      const recovery = this.closed
        ? Promise.resolve()
        : (this.forceTerminationPromise ?? this.forceTerminate());
      void recovery.finally(() =>
        pending.forEach(request => request.reject(error))
      );
    });
    child.once('error', cause => {
      const pending = [...this.pending.values()];
      this.pending.clear();
      const error = new CodeModeRuntimeError('runtime', cause.message, true, {
        cause,
        mayHaveSideEffects: true,
        browserStateLost: true,
      });
      void this.forceTerminate().finally(() =>
        pending.forEach(request => request.reject(error))
      );
    });
  }

  private handleMessage(message: unknown): void {
    if (!isChildResponse(message)) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.ok) {
      pending.resolve(message.result);
      return;
    }
    const error = new CodeModeRuntimeError(
      message.error.kind,
      message.error.message,
      message.error.retryable,
      {
        cause: message.error,
        mayHaveSideEffects: message.error.mayHaveSideEffects,
        browserStateLost: message.error.browserStateLost,
      }
    );
    if (!message.error.browserStateLost) {
      pending.reject(error);
      return;
    }
    void this.forceTerminate().finally(() => pending.reject(error));
  }

  private request(
    request: ChildRequestWithoutId,
    signal?: AbortSignal,
    allowClosed = false,
    control: RequestControl = {}
  ): Promise<unknown> {
    if (this.closed && !allowClosed) {
      return Promise.reject(
        new CodeModeRuntimeError('closed', 'Code executor is closed.')
      );
    }
    const child = this.child;
    if (!child?.connected) {
      return Promise.reject(
        new CodeModeRuntimeError(
          'runtime',
          'Stagehand child is not connected.',
          true,
          {
            browserStateLost: true,
          }
        )
      );
    }
    if (signal?.aborted) {
      if (control.terminateOnAbort) void this.forceTerminate();
      return Promise.reject(
        abortError(signal.reason, control.terminateOnAbort === true)
      );
    }

    const id = randomUUID();
    return new Promise((resolve, reject) => {
      let watchdog: NodeJS.Timeout | undefined;
      const cleanup = () => {
        signal?.removeEventListener('abort', onAbort);
        if (watchdog) clearTimeout(watchdog);
      };
      const onAbort = () => {
        if (!this.pending.delete(id)) return;
        cleanup();
        if (control.terminateOnAbort) void this.forceTerminate();
        reject(abortError(signal?.reason, control.terminateOnAbort === true));
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      this.pending.set(id, {
        resolve: value => {
          cleanup();
          resolve(value);
        },
        reject: error => {
          cleanup();
          reject(error);
        },
      });
      if (control.hardTimeoutMs !== undefined) {
        watchdog = setTimeout(() => {
          if (!this.pending.delete(id)) return;
          cleanup();
          void this.forceTerminate();
          reject(
            control.timeoutError?.() ??
              new CodeModeRuntimeError(
                'runtime',
                'Stagehand child request timed out.',
                true,
                {
                  browserStateLost: true,
                }
              )
          );
        }, control.hardTimeoutMs);
      }
      child.send({ ...request, id } as ChildRequest, error => {
        if (!error) return;
        this.pending.delete(id);
        cleanup();
        void this.forceTerminate();
        reject(error);
      });
    });
  }

  private forceTerminate(): Promise<void> {
    this.forceTerminationPromise ??= (async () => {
      const child = this.child;
      if (child) await terminateChild(child, 'SIGKILL');
      if (this.child === child) this.child = undefined;
      if (!this.closed) this.configurePromise = undefined;
      await this.releaseBrowserbaseSessions();
    })();
    return this.forceTerminationPromise;
  }

  private releaseBrowserbaseSessions(): Promise<void> {
    if (this.releasePromise) return this.releasePromise;
    const release = this.releaseBrowserbaseSessionsInternal();
    this.releasePromise = release;
    void release.finally(() => {
      if (this.releasePromise === release) this.releasePromise = undefined;
    });
    return release;
  }

  private async releaseBrowserbaseSessionsInternal(): Promise<void> {
    const apiKey = this.config.browserbaseApiKey;
    if (!apiKey) return;
    const browserbase = new Browserbase({ apiKey });
    let lastError: unknown;
    for (const delayMs of RELEASE_SWEEP_DELAYS_MS) {
      if (delayMs)
        await new Promise<void>(resolve => setTimeout(resolve, delayMs));
      try {
        const sessions = await browserbase.sessions.list({ status: 'RUNNING' });
        const ids = sessions
          .filter(
            session =>
              session.userMetadata?.integration === 'stagehand-codemode' &&
              session.userMetadata?.runtimeTagHash === this.runtimeTagHash
          )
          .map(session => session.id);
        await Promise.all(
          ids.map(id =>
            browserbase.sessions.update(id, { status: 'REQUEST_RELEASE' })
          )
        );
        lastError = undefined;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) {
      const message =
        lastError instanceof Error ? lastError.message : String(lastError);
      process.stderr.write(
        `Failed to release a Stagehand code-mode browser: ${message}\n`
      );
    }
  }

  private get runtimeTagHash(): string {
    return createHash('sha256')
      .update(this.runtimeTag)
      .digest('hex')
      .slice(0, 16);
  }
}

export function createStagehandChildRuntime(
  config: StagehandCodeRuntimeConfig,
  options?: StagehandChildRuntimeOptions
): CodeRuntime {
  return new StagehandChildRuntime(config, options);
}

function abortError(reason: unknown, stateLost: boolean): CodeModeRuntimeError {
  return new CodeModeRuntimeError(
    'aborted',
    'Code execution was aborted.',
    true,
    {
      cause: reason,
      mayHaveSideEffects: stateLost,
      browserStateLost: stateLost,
    }
  );
}

function childEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const safe: NodeJS.ProcessEnv = {};
  for (const key of CHILD_ENV_KEYS) {
    if (env[key] !== undefined) safe[key] = env[key];
  }
  return safe;
}

async function terminateChild(
  child: ChildProcess,
  signal: NodeJS.Signals
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>(resolve =>
    child.once('exit', () => resolve())
  );
  child.kill(signal);
  await Promise.race([
    exited,
    new Promise<void>(resolve => setTimeout(resolve, CHILD_EXIT_GRACE_MS)),
  ]);
  if (child.exitCode === null && child.signalCode === null)
    child.kill('SIGKILL');
}

function isChildResponse(value: unknown): value is ChildResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'ok' in value &&
    typeof value.ok === 'boolean'
  );
}
