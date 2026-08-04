import { createStagehandChildRuntime } from './child-runtime.js';
import type {
  CodeExecuteFailure,
  CodeExecuteInput,
  CodeExecuteResult,
  CodeRuntime,
  StagehandCodeRuntimeConfig,
} from './types.js';
import { CodeModeRuntimeError } from './types.js';

export type StagehandCodeExecutorOptions = StagehandCodeRuntimeConfig & {
  runtimeFactory?: () => CodeRuntime;
};

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 300_000;
const MAX_CODE_BYTES = 100_000;

export class StagehandCodeExecutor {
  private runtime?: CodeRuntime;
  private queue = Promise.resolve();
  private closePromise?: Promise<void>;
  private readonly defaultTimeoutMs: number;

  constructor(private readonly options: StagehandCodeExecutorOptions) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    requireTimeout(this.defaultTimeoutMs, 'defaultTimeoutMs');
  }

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
    this.closePromise ??= this.queue.then(async () => {
      const runtime = this.runtime;
      this.runtime = undefined;
      await runtime?.close();
    });
    return this.closePromise;
  }

  private async executeQueued(
    input: CodeExecuteInput,
    signal?: AbortSignal
  ): Promise<CodeExecuteResult> {
    if (this.closePromise)
      return failure('closed', 'Code executor is closed.', false, false);
    if (signal?.aborted)
      return failure('aborted', 'Code execution was aborted.', true, false);
    const runtime = (this.runtime ??= this.createRuntime());
    try {
      const result = await runtime.run(
        input.code,
        input.timeout_ms ?? this.defaultTimeoutMs,
        signal
      );
      return {
        ok: true,
        browser_state: 'preserved',
        page: result.page,
        ...(result.value === undefined ? {} : { value: result.value }),
        ...(result.logs.length === 0 ? {} : { logs: result.logs }),
      };
    } catch (error) {
      const stateLost =
        error instanceof CodeModeRuntimeError && error.browserStateLost;
      if (stateLost) {
        this.runtime = undefined;
        await runtime.close().catch(() => undefined);
      }
      return failureFromError(error, stateLost);
    }
  }

  private createRuntime(): CodeRuntime {
    if (this.options.runtimeFactory) return this.options.runtimeFactory();
    return createStagehandChildRuntime(this.options);
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
      'code must be a non-empty JavaScript function body.',
      false,
      false
    );
  }
  if (Buffer.byteLength(input.code) > MAX_CODE_BYTES) {
    return failure(
      'validation',
      `code must be at most ${MAX_CODE_BYTES} UTF-8 bytes.`,
      false,
      false
    );
  }
  if (input.timeout_ms !== undefined) {
    try {
      requireTimeout(input.timeout_ms, 'timeout_ms');
    } catch (error) {
      return failure('validation', (error as Error).message, false, false);
    }
  }
  return undefined;
}

function requireTimeout(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_TIMEOUT_MS) {
    throw new Error(
      `${label} must be an integer from 1 through ${MAX_TIMEOUT_MS}.`
    );
  }
}

function failureFromError(
  error: unknown,
  stateLost: boolean
): CodeExecuteFailure {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const runtimeError =
    error instanceof CodeModeRuntimeError ? error : undefined;
  return failure(
    runtimeError?.kind ?? 'runtime',
    normalized.message,
    runtimeError?.retryable ?? true,
    stateLost,
    runtimeError?.mayHaveSideEffects ?? false,
    normalized.name
  );
}

function failure(
  kind: CodeExecuteFailure['error']['kind'],
  message: string,
  retryable: boolean,
  stateLost: boolean,
  mayHaveSideEffects = false,
  name = 'CodeModeRuntimeError'
): CodeExecuteFailure {
  return {
    ok: false,
    browser_state: stateLost ? 'discarded' : 'preserved',
    error: {
      kind,
      name,
      message,
      retryable,
      ...(mayHaveSideEffects ? { may_have_side_effects: true } : {}),
    },
  };
}
