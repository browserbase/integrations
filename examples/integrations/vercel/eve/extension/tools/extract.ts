import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { withStagehand } from '../lib/stagehand';

const jsonSchema = z
  .record(z.string(), z.unknown())
  .describe('A JSON Schema describing the exact data shape to return.');

export default defineTool({
  description:
    'Extract structured data from the current Browserbase page with Stagehand and validate it against a JSON Schema.',
  inputSchema: z.object({
    instruction: z.string().min(1).describe('What data to extract.'),
    schema: jsonSchema,
  }),
  async execute({ instruction, schema }, ctx) {
    const outputSchema = z.fromJSONSchema(schema);
    return withStagehand(ctx.session.id, stagehand =>
      stagehand.extract(instruction, outputSchema)
    );
  },
});
