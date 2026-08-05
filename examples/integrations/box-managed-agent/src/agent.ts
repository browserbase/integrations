import 'dotenv/config';

import Browserbase from '@browserbasehq/sdk';

const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

async function main() {
  const agent = await browserbase.agents.create({
    name: 'Authenticated PDF gatherer for Box',
    systemPrompt: `Download the private PDF requested in each run.

The browser session already contains the user's authenticated state. Visit the supplied private page and use the named control to download its PDF. The file must be a real browser download attached to the Browserbase session so it can be retrieved with the Downloads API. Do not use web search, a Fetch API, a shell download, copied page text, or a public replacement for the requested private file.

If the site shows a login screen, stop and report that the saved context needs to be refreshed. Otherwise, wait for the download to begin and return the source URL and exact downloaded filename.`,
    resultSchema: {
      type: 'object',
      properties: {
        downloadedFile: {
          type: 'object',
          properties: {
            sourceUrl: { type: 'string' },
            filename: { type: 'string' },
          },
          required: ['sourceUrl', 'filename'],
          additionalProperties: false,
        },
      },
      required: ['downloadedFile'],
      additionalProperties: false,
    },
  });

  console.log(`Created Browserbase Agent: ${agent.agentId}`);
  console.log(`Set BROWSERBASE_AGENT_ID=${agent.agentId} in .env`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
