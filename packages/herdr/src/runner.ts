import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CommandRunner } from './types.js';

export function browseExecutable(): string {
  const extension = process.platform === 'win32' ? '.cmd' : '';
  return join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'node_modules',
    '.bin',
    `browse${extension}`
  );
}

export const runBrowse: CommandRunner = async (args, options = {}) =>
  await new Promise((resolve, reject) => {
    const capture = options.capture ?? false;
    const child = spawn(browseExecutable(), args, {
      env: { ...process.env, BROWSE_LOAD_DOTENV: '0' },
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.once('error', reject);
    child.once('close', code => resolve({ status: code ?? 1, stdout, stderr }));
  });

export function parseJsonOutput<T>(result: {
  status: number;
  stdout: string;
  stderr: string;
}): T {
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'browse command failed');
  }
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    throw new Error('browse returned invalid JSON');
  }
}
