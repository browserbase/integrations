import { generateText, stepCountIs, type LanguageModel } from 'ai';
import { STAGEHAND_CODEMODE_SKILL } from '@browserbasehq/stagehand-codemode';
import { createStagehandTool } from '@browserbasehq/stagehand-codemode/ai-sdk';

export async function runStagehandAgent(
  model: LanguageModel,
  prompt: string
): Promise<string> {
  const stagehand = createStagehandTool({
    browserbaseApiKey: process.env.BROWSERBASE_API_KEY,
  });
  try {
    const result = await generateText({
      model,
      system: STAGEHAND_CODEMODE_SKILL,
      prompt,
      tools: { code_execute: stagehand.tool },
      stopWhen: stepCountIs(8),
    });
    return result.text;
  } finally {
    await stagehand.close();
  }
}
