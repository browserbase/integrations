import { z } from 'zod/v4';
import { STAGEHAND_CODEMODE_SKILL } from './skill.js';
import type { CodeExecuteResult } from './types.js';

export const CODE_EXECUTE_DESCRIPTION = [
  'Execute an async JavaScript function body against one long-lived Stagehand V4 browser on Browserbase.',
  'The local executor lazily creates the browser on the first call and reuses it for later calls.',
  'Code runs directly in the local MCP process. The owning agent framework should terminate and restart that process if it stops responding.',
  'This is trusted local code with filesystem, network, and in-process SDK access; it is not a security sandbox.',
  '',
  STAGEHAND_CODEMODE_SKILL,
].join('\n');

export const codeExecuteSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(100_000)
    .describe(
      'Async JavaScript function body. page, context, stagehand, z, and console are in scope.'
    ),
});

export function codeExecuteResultText(result: CodeExecuteResult): string {
  return JSON.stringify(result, null, 2);
}
