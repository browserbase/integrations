import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function bundledSkillPath(): string {
  return join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'skills',
    'herdr-browse'
  );
}

export async function showBundledSkill(): Promise<number> {
  process.stdout.write(await readFile(join(bundledSkillPath(), 'SKILL.md')));
  return 0;
}

export async function installBundledSkill(): Promise<number> {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = [
    '--yes',
    'skills',
    'add',
    bundledSkillPath(),
    '--yes',
    '--global',
    '--agent',
    '*',
  ];

  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit' });
    child.once('error', error => {
      reject(
        new Error(
          `Could not run npx to install the herdr-browse skill: ${error.message}`
        )
      );
    });
    child.once('close', code => resolve(code ?? 1));
  });
}
