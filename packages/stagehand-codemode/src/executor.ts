import { z } from 'zod/v4';
import type {
  CodeExecuteFailure,
  CodeExecuteInput,
  CodeExecuteResult,
  CodeLogEntry,
  CodePageState,
  StagehandCodeConfig,
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

export type StagehandCodeExecutorOptions = StagehandCodeConfig;

const AsyncFunction = Object.getPrototypeOf(async function () {})
  .constructor as new (
  ...args: string[]
) => (...values: unknown[]) => Promise<unknown>;
const MAX_CODE_BYTES = 100_000;
const MAX_LOG_BYTES = 64 * 1024;
const MAX_RESULT_BYTES = 256 * 1024;

export class StagehandCodeExecutor {
  private stagehand?: StagehandLike;
  private queue = Promise.resolve();
  private closed = false;
  private closePromise?: Promise<void>;

  constructor(private readonly options: StagehandCodeExecutorOptions) {}

  execute(
    input: CodeExecuteInput,
    signal?: AbortSignal
  ): Promise<CodeExecuteResult> {
    const validation = validate(input);
    if (validation) return Promise.resolve(validation);

    const operation = this.queue.then(() => this.executeQueued(input, signal));
    this.queue = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  }

  close(): Promise<void> {
    this.closed = true;
    this.closePromise ??= this.queue.then(async () => {
      const current = this.stagehand;
      this.stagehand = undefined;
      await current?.close();
    });
    return this.closePromise;
  }

  private async executeQueued(
    input: CodeExecuteInput,
    signal?: AbortSignal
  ): Promise<CodeExecuteResult> {
    if (this.closed) {
      return failure('closed', 'Code executor is closed.');
    }
    if (signal?.aborted) {
      return failure('aborted', 'Code execution was aborted before it began.');
    }

    const logs: CodeLogEntry[] = [];
    let page: PageLike | undefined;
    try {
      const stagehand = await this.ensureStagehand();
      const context = stagehand.context;
      page =
        (await context.activePage()) ??
        (await context.pages())[0] ??
        (await context.newPage());

      const fn = new AsyncFunction(
        'page',
        'context',
        'stagehand',
        'z',
        'console',
        input.code
      );
      const value = await fn(
        page,
        context,
        stagehand,
        z,
        createCodeConsole(logs)
      );

      return {
        ok: true,
        page: await readPageState(page),
        ...(value === undefined ? {} : { value: jsonSafe(value) }),
        ...(logs.length === 0 ? {} : { logs }),
      };
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      const currentPage =
        page ?? (await this.activePage().catch(() => undefined));
      return failure('runtime', normalized.message, normalized.name, {
        ...(currentPage
          ? { page: await readPageState(currentPage).catch(() => undefined) }
          : {}),
        ...(logs.length === 0 ? {} : { logs }),
      });
    }
  }

  private async ensureStagehand(): Promise<StagehandLike> {
    if (this.stagehand) return this.stagehand;
    if (!this.options.browserbaseApiKey) {
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

    const next = new imported.Stagehand({
      apiKey: this.options.browserbaseApiKey,
      browser: { type: 'browserbase' },
      logging: { level: 'off' },
      ...(this.options.model ? { model: this.options.model } : {}),
    });
    try {
      await next.init();
    } catch (error) {
      await next.close().catch(() => undefined);
      throw error;
    }
    this.stagehand = next;
    return next;
  }

  private async activePage(): Promise<PageLike | undefined> {
    if (!this.stagehand) return undefined;
    return (
      (await this.stagehand.context.activePage()) ??
      (await this.stagehand.context.pages())[0]
    );
  }
}

function validate(input: CodeExecuteInput): CodeExecuteFailure | undefined {
  if (
    !input ||
    typeof input.code !== 'string' ||
    input.code.trim().length === 0
  ) {
    return failure(
      'validation',
      'code must be a non-empty JavaScript function body.'
    );
  }
  if (Buffer.byteLength(input.code) > MAX_CODE_BYTES) {
    return failure(
      'validation',
      `code must be at most ${MAX_CODE_BYTES} UTF-8 bytes.`
    );
  }
  return undefined;
}

function createCodeConsole(logs: CodeLogEntry[]) {
  let logBytes = 0;
  const append = (level: CodeLogEntry['level'], values: unknown[]) => {
    if (logBytes >= MAX_LOG_BYTES) return;
    const text = formatLog(values);
    const remaining = MAX_LOG_BYTES - logBytes;
    const bounded = Buffer.from(text).subarray(0, remaining).toString();
    logBytes += Buffer.byteLength(bounded);
    logs.push({ level, text: bounded });
  };
  return Object.freeze({
    log: (...values: unknown[]) => append('log', values),
    warn: (...values: unknown[]) => append('warn', values),
    error: (...values: unknown[]) => append('error', values),
  });
}

async function readPageState(page: PageLike): Promise<CodePageState> {
  const [url, title] = await Promise.all([page.url(), page.title()]);
  return { url, title };
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
  if (serialized === undefined) return undefined;
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
    .map(value => {
      if (typeof value === 'string') return value;
      const safe = jsonSafe(value);
      return safe === undefined ? String(value) : JSON.stringify(safe);
    })
    .join(' ');
}

function failure(
  kind: CodeExecuteFailure['error']['kind'],
  message: string,
  name = 'CodeModeError',
  evidence: Pick<CodeExecuteFailure, 'page' | 'logs'> = {}
): CodeExecuteFailure {
  return {
    ok: false,
    ...evidence,
    error: { kind, name, message },
  };
}
