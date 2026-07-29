import 'dotenv/config';

import Browserbase from '@browserbasehq/sdk';

const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

async function main() {
  const agent = await browserbase.agents.create({
    name: 'Box compliance document gatherer',
    systemPrompt: `Gather the compliance documents requested in each run.

Use the browser to visit each supplied source page in the requested order and click the named download link. The files must be real browser downloads attached to the Browserbase session so they can be retrieved with the Downloads API. Do not substitute web search, Fetch API results, shell downloads, summaries, or copied page text for the requested files.

Wait for each download to begin before continuing. Finish only after both documents have been downloaded. Return the source URL, role, and downloaded filename for each document.`,
    resultSchema: {
      type: 'object',
      properties: {
        downloadedFiles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['sds', 'label'] },
              sourceUrl: { type: 'string' },
              filename: { type: 'string' },
            },
            required: ['role', 'sourceUrl', 'filename'],
            additionalProperties: false,
          },
        },
      },
      required: ['downloadedFiles'],
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
