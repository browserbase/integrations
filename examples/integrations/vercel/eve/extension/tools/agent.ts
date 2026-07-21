import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { withStagehand } from '../lib/stagehand';

export default defineTool({
  description:
    'Run an autonomous multi-step Stagehand browser task in the current Browserbase session. Prefer act, observe, and extract for targeted work.',
  inputSchema: z.object({
    instruction: z.string().min(1).describe('The browser task to complete.'),
    maxSteps: z.number().int().min(1).max(50).default(20),
  }),
  async execute({ instruction, maxSteps }, ctx) {
    return withStagehand(ctx.session.id, async stagehand => {
      const agent = stagehand.agent();
      return agent.execute({
        instruction,
        maxSteps,
      });
    });
  },
});
