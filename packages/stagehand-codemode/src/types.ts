export type CodeExecuteInput = {
  code: string;
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
  | 'validation'
  | 'runtime'
  | 'aborted'
  | 'closed';

export type CodeExecuteSuccess = {
  ok: true;
  page: CodePageState;
  value?: unknown;
  logs?: CodeLogEntry[];
};

export type CodeExecuteFailure = {
  ok: false;
  page?: CodePageState;
  logs?: CodeLogEntry[];
  error: {
    kind: CodeExecuteErrorKind;
    name: string;
    message: string;
  };
};

export type CodeExecuteResult = CodeExecuteSuccess | CodeExecuteFailure;

export type StagehandCodeConfig = {
  browserbaseApiKey?: string;
  model?: {
    modelName: string;
    apiKey?: string;
    baseURL?: string;
  };
};
