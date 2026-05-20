export type BrowserbaseConfig = {
  apiKey?: string;
  projectId?: string;
  baseUrl: string;
  promptOnStart?: boolean; // undefined = not explicitly set; callers default to true
  autoSyncSkills?: boolean; // undefined = not explicitly set; callers default to true
};

const DEFAULT_BASE_URL = 'https://api.browserbase.com';

const ALLOWED_KEYS = [
  'apiKey',
  'projectId',
  'baseUrl',
  'promptOnStart',
  'autoSyncSkills',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  label: string
): void {
  const unknown = Object.keys(value).filter(key => !ALLOWED_KEYS.includes(key));
  if (unknown.length > 0) {
    throw new Error(`${label} has unknown keys: ${unknown.join(', ')}`);
  }
}

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, envVar: string) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return envValue;
  });
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return resolveEnvVars(trimmed);
}

function parseBaseUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_BASE_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_BASE_URL;
  }

  return resolveEnvVars(trimmed);
}

export function parseConfig(raw: unknown): BrowserbaseConfig {
  const cfg = isRecord(raw) ? raw : {};

  if (Object.keys(cfg).length > 0) {
    assertAllowedKeys(cfg, 'browserbase config');
  }

  let apiKey: string | undefined;
  let projectId: string | undefined;

  try {
    apiKey = parseOptionalString(cfg.apiKey) ?? process.env.BROWSERBASE_API_KEY;
  } catch {
    apiKey = process.env.BROWSERBASE_API_KEY;
  }

  try {
    projectId =
      parseOptionalString(cfg.projectId) ?? process.env.BROWSERBASE_PROJECT_ID;
  } catch {
    projectId = process.env.BROWSERBASE_PROJECT_ID;
  }

  return {
    apiKey,
    projectId,
    baseUrl: parseBaseUrl(cfg.baseUrl),
    promptOnStart:
      typeof cfg.promptOnStart === 'boolean' ? cfg.promptOnStart : undefined,
    autoSyncSkills:
      typeof cfg.autoSyncSkills === 'boolean' ? cfg.autoSyncSkills : undefined,
  };
}

export function mergeConfig(
  primary: BrowserbaseConfig,
  fallback: BrowserbaseConfig
): BrowserbaseConfig {
  return {
    apiKey: primary.apiKey ?? fallback.apiKey,
    projectId: primary.projectId ?? fallback.projectId,
    baseUrl: primary.baseUrl ?? fallback.baseUrl,
    promptOnStart: primary.promptOnStart ?? fallback.promptOnStart,
    autoSyncSkills: primary.autoSyncSkills ?? fallback.autoSyncSkills,
  };
}

export const browserbaseConfigSchema = {
  jsonSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      apiKey: { type: 'string' },
      projectId: { type: 'string' },
      baseUrl: { type: 'string' },
      promptOnStart: { type: 'boolean' },
      autoSyncSkills: { type: 'boolean' },
    },
  },
  parse: parseConfig,
};
