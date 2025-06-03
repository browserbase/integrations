import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';

import { webAgent } from './agents';

export const mastra = new Mastra({
  agents: { webAgent },
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
