import 'dotenv/config';

import Browserbase from '@browserbasehq/sdk';

const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

async function main() {
  const agent = await browserbase.agents.create({
    name: 'PG&E utility bill gatherer for Box',
    systemPrompt: `Download the latest PG&E bill requested in each run.

The browser session already contains the user's authenticated state. Open the PG&E account dashboard, find Billing & Payment History, select the newest available bill, and click "View Bill PDF". The bill must be a real browser download attached to the Browserbase session so it can be retrieved with the Downloads API. Do not use web search, a Fetch API, a shell download, copied page text, or a public replacement.

If the site shows a login screen, stop and report that the saved context needs to be refreshed. Otherwise, wait for the download to begin and return only its exact downloaded filename. Never return or describe the customer name, service address, account number, or payment details.`,
    resultSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
      },
      required: ['filename'],
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
