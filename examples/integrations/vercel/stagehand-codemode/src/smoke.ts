import { STAGEHAND_CODEMODE_SKILL } from '@browserbasehq/stagehand-codemode';
import { createStagehandTool } from '@browserbasehq/stagehand-codemode/ai-sdk';

const stagehand = createStagehandTool({});
try {
  if (typeof stagehand.tool.execute !== 'function') {
    throw new Error('AI SDK binding did not expose an executable tool.');
  }
  const description = stagehand.tool.description;
  if (
    typeof description !== 'string' ||
    !description.includes('Stagehand V4 code-mode syntax')
  ) {
    throw new Error(
      'AI SDK tool description did not include the Stagehand syntax skill.'
    );
  }
  if (!STAGEHAND_CODEMODE_SKILL.includes('stagehand.extract')) {
    throw new Error(
      'AI SDK system instructions did not load the Stagehand syntax skill.'
    );
  }
  process.stdout.write(
    'Vercel AI SDK native tool binding PASS: code_execute\n'
  );
} finally {
  await stagehand.close();
}
