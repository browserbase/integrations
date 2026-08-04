import type {
  CodeLogEntry,
  CodePageState,
  RuntimeRunResult,
  StagehandCodeRuntimeConfig,
} from './types.js';

export type ChildRequest =
  | {
      id: string;
      type: 'configure';
      runtimeTag: string;
      config: StagehandCodeRuntimeConfig;
    }
  | {
      id: string;
      type: 'run';
      code: string;
      timeoutMs: number;
    }
  | {
      id: string;
      type: 'close';
    };

export type ChildResponse =
  | {
      id: string;
      ok: true;
      result?: RuntimeRunResult | { closed: true };
    }
  | {
      id: string;
      ok: false;
      error: {
        name: string;
        message: string;
        kind: 'runtime' | 'timeout' | 'closed';
        retryable: boolean;
        mayHaveSideEffects: boolean;
        browserStateLost: boolean;
        stack?: string;
      };
      page?: CodePageState;
      logs?: CodeLogEntry[];
    };
