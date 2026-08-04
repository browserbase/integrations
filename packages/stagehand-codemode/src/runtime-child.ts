import { createHash } from 'node:crypto';
import { z } from 'zod/v4';
import type { ChildRequest, ChildResponse } from './runtime-protocol.js';
import type {
  CodeLogEntry,
  CodePageState,
  RuntimeRunResult,
  StagehandCodeRuntimeConfig,
} from './types.js';

type PageLike = {
  url(): Promise<string>;
  title(): Promise<string>;
};

type ContextLike = {
  activePage(): Promise<PageLike | undefined>;
  pages(): Promise<PageLike[]>;
  newPage(): Promise<PageLike>;
};

type StagehandLike = Record<string, unknown> & {
  context: ContextLike;
  init(): Promise<void>;
  close(): Promise<void>;
};

type StagehandConstructor = new (
  options: Record<string, unknown>
) => StagehandLike;

const AsyncFunction = Object.getPrototypeOf(async function () {})
  .constructor as new (
  ...args: string[]
) => (...values: unknown[]) => Promise<unknown>;
const MAX_LOG_BYTES = 64 * 1024;
const MAX_RESULT_BYTES = 256 * 1024;

let config: StagehandCodeRuntimeConfig | undefined;
let runtimeTag: string | undefined;
let stagehand: StagehandLike | undefined;
let closed = false;
let queue = Promise.resolve();

process.on('message', (message: unknown) => {
  if (!isChildRequest(message)) return;
  queue = queue.then(() => handle(message));
});
process.once('SIGTERM', () => void shutdown(0));
process.once('SIGINT', () => void shutdown(0));
process.once('disconnect', () => void shutdown(0));

async function handle(request: ChildRequest): Promise<void> {
  try {
    if (request.type === 'configure') {
      if (config)
        throw new Error('Stagehand code runtime is already configured.');
      config = request.config;
      runtimeTag = request.runtimeTag;
      send({ id: request.id, ok: true });
      return;
    }
    if (request.type === 'close') {
      closed = true;
      await closeStagehand();
      send({ id: request.id, ok: true, result: { closed: true } });
      setImmediate(() => process.exit(0));
      return;
    }
    requireConfigured();
    const result = await run(request.code, request.timeoutMs);
    send({ id: request.id, ok: true, result });
  } catch (error) {
    const normalized = normalizeError(error);
    send({
      id: request.id,
      ok: false,
      error: normalized,
      page: await readPageState().catch(() => undefined),
    });
    if (normalized.browserStateLost) {
      closed = true;
      void closeStagehand()
        .catch(() => undefined)
        .finally(() => process.exit(1));
      setTimeout(() => process.exit(1), 2_000).unref();
    }
  }
}

async function ensureStagehand(): Promise<StagehandLike> {
  requireConfigured();
  const configuredRuntimeTag = runtimeTag;
  if (!configuredRuntimeTag) {
    throw new Error('Stagehand code runtime is not configured.');
  }
  if (stagehand) return stagehand;
  if (!config?.browserbaseApiKey) {
    throw new Error(
      'BROWSERBASE_API_KEY is required before the first code_execute call.'
    );
  }
  const packageName = '@browserbasehq/stagehand';
  const imported = (await import(packageName)) as {
    Stagehand?: StagehandConstructor;
    StagehandClientInitParamsSchema?: unknown;
  };
  if (!imported.Stagehand || !imported.StagehandClientInitParamsSchema) {
    throw new Error(
      'Stagehand code mode requires a local Stagehand V4 build resolvable as @browserbasehq/stagehand.'
    );
  }
  const options: Record<string, unknown> = {
    apiKey: config.browserbaseApiKey,
    browser: {
      type: 'browserbase',
      userMetadata: {
        integration: 'stagehand-codemode',
        runtimeTagHash: createHash('sha256')
          .update(configuredRuntimeTag)
          .digest('hex')
          .slice(0, 16),
      },
    },
    logging: { level: 'off' },
    ...(config.model ? { model: config.model } : {}),
  };
  const next = new imported.Stagehand(options);
  await next.init();
  stagehand = next;
  return next;
}

async function run(code: string, timeoutMs: number): Promise<RuntimeRunResult> {
  if (closed) throw new Error('Stagehand code runtime is closed.');
  const runtime = await ensureStagehand();
  const context = runtime.context;
  const page =
    (await context.activePage()) ??
    (await context.pages())[0] ??
    (await context.newPage());
  const logs: CodeLogEntry[] = [];
  let logBytes = 0;
  const appendLog = (level: CodeLogEntry['level'], values: unknown[]) => {
    if (logBytes >= MAX_LOG_BYTES) return;
    const text = formatLog(values);
    const remaining = MAX_LOG_BYTES - logBytes;
    const bounded = Buffer.from(text).subarray(0, remaining).toString();
    logBytes += Buffer.byteLength(bounded);
    logs.push({ level, text: bounded });
  };
  const codeConsole = Object.freeze({
    log: (...values: unknown[]) => appendLog('log', values),
    warn: (...values: unknown[]) => appendLog('warn', values),
    error: (...values: unknown[]) => appendLog('error', values),
  });
  const fn = new AsyncFunction(
    'page',
    'context',
    'stagehand',
    'z',
    'console',
    code
  );
  let timeout: NodeJS.Timeout | undefined;
  try {
    const value = await Promise.race([
      fn(page, context, runtime, z, codeConsole),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          const error = new Error(`Code execution exceeded ${timeoutMs}ms.`);
          error.name = 'CodeExecutionTimeoutError';
          reject(error);
        }, timeoutMs);
      }),
    ]);
    return {
      value: jsonSafe(value),
      logs,
      page: await readRequiredPageState(page),
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readPageState(): Promise<CodePageState | undefined> {
  if (!stagehand) return undefined;
  const context = stagehand.context;
  const page = (await context.activePage()) ?? (await context.pages())[0];
  return page ? readRequiredPageState(page) : undefined;
}

async function readRequiredPageState(page: PageLike): Promise<CodePageState> {
  const [url, title] = await Promise.all([page.url(), page.title()]);
  return { url, title };
}

async function closeStagehand(): Promise<void> {
  const current = stagehand;
  stagehand = undefined;
  await current?.close();
}

async function shutdown(code: number): Promise<void> {
  closed = true;
  await closeStagehand().catch(() => undefined);
  process.exit(code);
}

function requireConfigured(): void {
  if (!config || !runtimeTag)
    throw new Error('Stagehand code runtime is not configured.');
}

function normalizeError(
  error: unknown
): Extract<ChildResponse, { ok: false }>['error'] {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const timeout = normalized.name === 'CodeExecutionTimeoutError';
  return {
    name: normalized.name,
    message: normalized.message,
    kind: timeout ? 'timeout' : closed ? 'closed' : 'runtime',
    retryable: timeout,
    mayHaveSideEffects: timeout,
    browserStateLost: timeout,
    ...(normalized.stack ? { stack: normalized.stack } : {}),
  };
}

function jsonSafe(value: unknown): unknown {
  if (value === undefined) return undefined;
  const serialized = JSON.stringify(value, (_key, nested) => {
    if (typeof nested === 'bigint') return nested.toString();
    if (nested instanceof Uint8Array) {
      return {
        type: 'bytes',
        encoding: 'base64',
        data: Buffer.from(nested).toString('base64'),
      };
    }
    return nested;
  });
  const bytes = Buffer.byteLength(serialized);
  if (bytes <= MAX_RESULT_BYTES) return JSON.parse(serialized);
  return {
    truncated: true,
    original_bytes: bytes,
    preview: Buffer.from(serialized).subarray(0, MAX_RESULT_BYTES).toString(),
  };
}

function formatLog(values: unknown[]): string {
  return values
    .map(value =>
      typeof value === 'string' ? value : JSON.stringify(jsonSafe(value))
    )
    .join(' ');
}

function send(response: ChildResponse): void {
  if (process.connected) process.send?.(response);
}

function isChildRequest(value: unknown): value is ChildRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'type' in value &&
    (value.type === 'configure' ||
      value.type === 'run' ||
      value.type === 'close')
  );
}
