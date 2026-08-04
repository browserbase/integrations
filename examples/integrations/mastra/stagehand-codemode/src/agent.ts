import { fileURLToPath } from 'node:url';
import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';
import { STAGEHAND_CODEMODE_SKILL } from '@browserbasehq/stagehand-codemode';

const DEFAULT_CLI_PATH = fileURLToPath(
  new URL(
    '../../../../../packages/stagehand-codemode/dist/cli.js',
    import.meta.url
  )
);

export function createStagehandMcpClient(
  cliPath = DEFAULT_CLI_PATH
): MCPClient {
  return new MCPClient({
    id: 'stagehand-codemode',
    servers: {
      stagehand: {
        command: process.execPath,
        args: [cliPath],
        env: definedEnvironment(),
      },
    },
  });
}

export async function runStagehandAgent(prompt: string): Promise<string> {
  const mcp = createStagehandMcpClient();
  try {
    const { tools, errors } = await mcp.listToolsWithErrors();
    if (Object.keys(errors).length > 0) {
      throw new Error(
        `Stagehand MCP discovery failed: ${JSON.stringify(errors)}`
      );
    }
    const agent = new Agent({
      id: 'stagehand-browser-agent',
      name: 'Stagehand browser agent',
      instructions: STAGEHAND_CODEMODE_SKILL,
      model: process.env.MASTRA_MODEL ?? 'openai/gpt-5-mini',
      tools,
    });
    const result = await agent.generate(prompt, { maxSteps: 8 });
    return result.text;
  } finally {
    await mcp.disconnect();
  }
}

function definedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
}
