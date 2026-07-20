import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { withStagehand } from '../lib/stagehand';

export default defineTool({
  description:
    'Inspect the current Browserbase page with Stagehand and return candidate elements and actions.',
  inputSchema: z.object({
    instruction: z
      .string()
      .min(1)
      .describe('The elements or actions to find on the page.'),
  }),
  async execute({ instruction }) {
    return withStagehand(stagehand => stagehand.observe(instruction));
  },
});
