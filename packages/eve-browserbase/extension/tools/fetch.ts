import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { createBrowserbaseClient } from '../lib/browserbase';

const jsonSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    'A JSON Schema for structured extraction. Required with the json format and invalid with other formats.'
  );

export default defineTool({
  description:
    'Retrieve a URL through Browserbase Fetch without starting a browser session. Use raw for the original response, markdown for agent-friendly content, or json with a schema for structured extraction.',
  inputSchema: z.object({
    url: z.url().describe('The absolute URL to retrieve.'),
    format: z
      .enum(['raw', 'markdown', 'json'])
      .default('raw')
      .describe('The response content format.'),
    schema: jsonSchema,
    allowRedirects: z
      .boolean()
      .default(false)
      .describe('Whether to follow HTTP redirects.'),
    allowInsecureSsl: z
      .boolean()
      .default(false)
      .describe('Whether to bypass TLS certificate verification.'),
    proxies: z
      .boolean()
      .default(false)
      .describe('Whether to route the request through Browserbase proxies.'),
  }),
  async execute({
    url,
    format,
    schema,
    allowRedirects,
    allowInsecureSsl,
    proxies,
  }) {
    if (format === 'json' && !schema) {
      throw new Error('schema is required when format is json.');
    }
    if (format !== 'json' && schema) {
      throw new Error('schema can only be used when format is json.');
    }

    const browserbase = createBrowserbaseClient();
    return browserbase.fetchAPI.create({
      url,
      format,
      schema,
      allowRedirects,
      allowInsecureSsl,
      proxies,
    });
  },
});
