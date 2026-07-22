import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { createBrowserbaseClient } from '../lib/browserbase';

export default defineTool({
  description:
    'Search the public web with Browserbase Search. Use this to discover relevant URLs before fetching content or opening a browser session.',
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(200)
      .describe('The web search query, from 1 to 200 characters.'),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(25)
      .default(10)
      .describe('The number of results to return, from 1 to 25.'),
  }),
  async execute({ query, numResults }) {
    const browserbase = createBrowserbaseClient();
    return browserbase.search.web({ query, numResults });
  },
});
