import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_CONFIG_PATH = path.join(
  os.homedir(),
  '.openclaw',
  'openclaw.json'
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readJsonFile(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`Expected object at ${filePath}`);
  }

  return parsed;
}

export function resolveConfigPath(explicitPath?: string): string {
  if (explicitPath && explicitPath.trim()) {
    return path.resolve(process.cwd(), explicitPath.trim());
  }

  return DEFAULT_CONFIG_PATH;
}

export function readPluginConfig(
  filePath: string,
  pluginId: string
): Record<string, unknown> {
  const root = readJsonFile(filePath);
  const plugins = ensureRecord(root.plugins);
  const entries = ensureRecord(plugins.entries);
  const pluginEntry = ensureRecord(entries[pluginId]);
  return ensureRecord(pluginEntry.config);
}

export function writePluginConfig(
  filePath: string,
  pluginId: string,
  pluginConfig: Record<string, unknown>
): void {
  const root = readJsonFile(filePath);
  const plugins = ensureRecord(root.plugins);
  const entries = ensureRecord(plugins.entries);

  const existingEntry = ensureRecord(entries[pluginId]);
  const existingConfig = ensureRecord(existingEntry.config);

  entries[pluginId] = {
    ...existingEntry,
    enabled: existingEntry.enabled !== false,
    config: {
      ...existingConfig,
      ...pluginConfig,
    },
  };

  plugins.entries = entries;
  root.plugins = plugins;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(root, null, 2)}\n`, 'utf-8');
}

export function maskSecret(value: string | undefined): string {
  if (!value) {
    return 'not set';
  }

  if (value.length <= 8) {
    return `${'*'.repeat(Math.max(4, value.length))}`;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function dotenvEscape(value: string): string {
  // Wrap in double quotes if value contains whitespace, quotes, #, =, or backslashes
  if (
    /[\s"'#=\\]/.test(value) ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
  }
  return value;
}
