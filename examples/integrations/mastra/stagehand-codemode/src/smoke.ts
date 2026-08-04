import { STAGEHAND_CODEMODE_SKILL } from '@browserbasehq/stagehand-codemode';
import { createStagehandMcpClient } from './agent.js';

const mcp = createStagehandMcpClient();
try {
  const { tools, errors } = await mcp.listToolsWithErrors();
  if (Object.keys(errors).length > 0) throw new Error(JSON.stringify(errors));
  const names = Object.keys(tools);
  if (names.length !== 1 || !names[0]?.endsWith('code_execute')) {
    throw new Error(`Expected one code_execute tool, got ${names.join(', ')}`);
  }
  const description = Object.values(tools)[0]?.description ?? '';
  if (!description.includes('Stagehand V4 code-mode syntax')) {
    throw new Error(
      'Discovered tool description did not include the Stagehand syntax skill.'
    );
  }
  if (!STAGEHAND_CODEMODE_SKILL.includes('stagehand.extract')) {
    throw new Error(
      'Agent instructions did not load the Stagehand syntax skill.'
    );
  }
  process.stdout.write(`Mastra stdio discovery PASS: ${names[0]}\n`);
} finally {
  await mcp.disconnect();
}
