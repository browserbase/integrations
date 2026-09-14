#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { BrowserController } from './browser.js';
import { deriveIdentity } from './identity.js';
import { runBrowse } from './runner.js';
import { installBundledSkill, showBundledSkill } from './skill.js';
import { statePath } from './state.js';
import type { BrowserMode } from './types.js';

function usage(): string {
  return `Usage:
  herdr-browse open <url> [--local|--cloud]
  herdr-browse <browse-command> [...args]
  herdr-browse status [--json]
  herdr-browse stop
  herdr-browse reset [--yes]
  herdr-browse skills install
  herdr-browse skills show`;
}

async function confirmReset(): Promise<boolean> {
  if (!stdin.isTTY) return false;
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question(
      "Delete this workspace's Browserbase context and saved login state? [y/N] "
    );
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

export async function main(args = process.argv.slice(2)): Promise<number> {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(usage());
    return 0;
  }

  if (args[0] === 'skills' && args[1] === 'install' && args.length === 2) {
    return await installBundledSkill();
  }
  if (args[0] === 'skills' && args[1] === 'show' && args.length === 2) {
    return await showBundledSkill();
  }

  const identity = deriveIdentity();
  const controller = new BrowserController({
    identity,
    path: statePath(),
    run: runBrowse,
  });
  const command = args[0];

  if (command === 'open') {
    const url = args[1];
    if (!url) throw new Error('open requires a URL');
    const hasLocal = args.includes('--local');
    const hasCloud = args.includes('--cloud');
    if (hasLocal && hasCloud) {
      throw new Error('Choose either --local or --cloud, not both.');
    }
    const override: BrowserMode | undefined = hasLocal
      ? 'local'
      : hasCloud
        ? 'cloud'
        : undefined;
    return (await controller.open(url, override)).status;
  }

  if (command === 'status') {
    const status = await controller.status();
    if (args.includes('--json')) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(`Workspace: ${status.workspaceId}`);
      console.log(`Agent/pane: ${status.actorId}`);
      console.log(`Context: ${status.contextId ?? 'not created'}`);
      console.log(`Mode: ${status.session?.mode ?? 'stopped'}`);
      console.log(
        status.browse.stdout.trim() ||
          status.browse.stderr.trim() ||
          'Browse daemon is stopped.'
      );
    }
    return status.browse.status;
  }

  if (command === 'stop') return await controller.stop();

  if (command === 'reset') {
    if (!args.includes('--yes') && !(await confirmReset())) {
      console.error('Reset cancelled. Pass --yes for non-interactive use.');
      return 1;
    }
    return await controller.reset();
  }

  return (await controller.delegate(args)).status;
}

main().then(
  code => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
);
