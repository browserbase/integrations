import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { withStagehand } from '../lib/stagehand';

export default defineTool({
  description:
    'Perform one natural-language action in the current Browserbase page with Stagehand.',
  inputSchema: z.object({
    instruction: z
      .string()
      .min(1)
      .describe(
        'A precise single action, such as clicking or filling a field.'
      ),
  }),
  async execute({ instruction }, ctx) {
    return withStagehand(ctx.session.id, stagehand =>
      stagehand.act(instruction)
    );
  },
});
