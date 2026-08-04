export type CodeExecuteInput = {
  code: string;
  timeout_ms?: number;
};

export type CodePageState = {
  url: string;
  title: string;
};

export type CodeLogEntry = {
  level: 'log' | 'warn' | 'error';
  text: string;
};

export type CodeExecuteErrorKind =
  'validation' | 'runtime' | 'timeout' | 'aborted' | 'closed';

export type CodeExecuteSuccess = {
  ok: true;
  browser_state: 'preserved';
  page: CodePageState;
  value?: unknown;
  logs?: CodeLogEntry[];
};

export type CodeExecuteFailure = {
  ok: false;
  browser_state: 'preserved' | 'discarded';
  page?: CodePageState;
  logs?: CodeLogEntry[];
  error: {
    kind: CodeExecuteErrorKind;
    name: string;
    message: string;
    retryable: boolean;
    may_have_side_effects?: boolean;
  };
};

export type CodeExecuteResult = CodeExecuteSuccess | CodeExecuteFailure;

export type RuntimeRunResult = {
  value?: unknown;
  logs: CodeLogEntry[];
  page: CodePageState;
};

export interface CodeRuntime {
  run(
    code: string,
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<RuntimeRunResult>;
  close(): Promise<void>;
}

export type StagehandCodeRuntimeConfig = {
  browserbaseApiKey?: string;
  model?: {
    modelName: string;
    apiKey?: string;
    baseURL?: string;
  };
  defaultTimeoutMs?: number;
};

export class CodeModeRuntimeError extends Error {
  readonly mayHaveSideEffects: boolean;
  readonly browserStateLost: boolean;

  constructor(
    readonly kind: CodeExecuteErrorKind,
    message: string,
    readonly retryable = false,
    options?: ErrorOptions & {
      mayHaveSideEffects?: boolean;
      browserStateLost?: boolean;
    }
  ) {
    super(message, options);
    this.name = 'CodeModeRuntimeError';
    this.mayHaveSideEffects = options?.mayHaveSideEffects ?? false;
    this.browserStateLost = options?.browserStateLost ?? false;
  }
}
