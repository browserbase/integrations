#!/usr/bin/env node

import { runtimeConfigFromEnv } from './config.js';
import { StagehandCodeExecutor } from './executor.js';
import { connectCodeModeStdio } from './mcp-server.js';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    [
      'Usage: stagehand-codemode',
      '',
      'Starts a local MCP server over stdio. The parent agent framework owns the process.',
      '',
      'Environment:',
      '  BROWSERBASE_API_KEY          Required before the first code_execute call',
      '  STAGEHAND_MODEL_NAME         Optional provider/model name for Stagehand AI methods',
      '  STAGEHAND_MODEL_API_KEY      Optional model-provider API key',
      '  STAGEHAND_MODEL_BASE_URL     Optional model-provider base URL',
      '  CODEMODE_DEFAULT_TIMEOUT_MS  Optional default timeout (120000)',
      '',
    ].join('\n')
  );
  process.exit(0);
}
if (args.length > 0) throw new Error(`Unknown argument: ${args[0]}`);

const executor = new StagehandCodeExecutor(runtimeConfigFromEnv());
const server = await connectCodeModeStdio(executor);
let closing = false;

async function shutdown(code: number): Promise<void> {
  if (closing) return;
  closing = true;
  await server.close().catch(() => undefined);
  await executor.close().catch(error => {
    process.stderr.write(
      `Failed to close Stagehand code mode: ${String(error)}\n`
    );
  });
  process.exit(code);
}

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));
process.stdin.once('end', () => void shutdown(0));
process.stdin.once('close', () => void shutdown(0));
process.stderr.write('Stagehand code-mode MCP listening on stdio\n');
