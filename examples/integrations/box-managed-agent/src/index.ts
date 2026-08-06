import 'dotenv/config';

import Browserbase from '@browserbasehq/sdk';
import {
  applyGlobalProperties,
  askBox,
  boxAccessToken,
  DOCUMENT_FIELDS,
  extractBoxMetadata,
  uploadToBox,
} from './box.js';
import { getAgentDownload } from './downloads.js';

const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

type AgentResult = {
  output?: {
    filename?: string;
  };
};

async function runAgent() {
  const { runId } = await browserbase.agents.runs.create({
    agentId: process.env.BROWSERBASE_AGENT_ID as string,
    task: `Visit ${process.env.PGE_PORTAL_URL}. Using the authenticated browser session, open Billing & Payment History and download the latest bill with "View Bill PDF". Confirm the file is downloaded before finishing.`,
    browserSettings: {
      context: {
        id: process.env.BROWSERBASE_CONTEXT_ID as string,
        persist: true,
      },
    },
  });

  console.log(`Browserbase Agent run started: ${runId}`);
  let previousStatus: string | undefined;

  while (true) {
    const run = await browserbase.agents.runs.retrieve(runId);
    if (run.status !== previousStatus) {
      console.log(`Agent status: ${run.status}`);
      previousStatus = run.status;
    }

    if (!['PENDING', 'RUNNING'].includes(run.status)) {
      if (run.status !== 'COMPLETED') {
        throw new Error(`Browserbase Agent run ended with ${run.status}.`);
      }
      if (!run.sessionId) {
        throw new Error('Browserbase Agent run did not return a session ID.');
      }

      return run;
    }

    await new Promise(resolve => setTimeout(resolve, 2_000));
  }
}

async function main() {
  console.log(
    'Starting private PG&E bill intake with Browserbase Agent + Box AI...'
  );
  const run = await runAgent();
  const agentResult = run.result as AgentResult | undefined;
  const expectedFilename = agentResult?.output?.filename;
  if (!expectedFilename) {
    throw new Error(
      'Browserbase Agent result did not include a downloaded filename.'
    );
  }

  const file = await getAgentDownload(
    run.sessionId as string,
    expectedFilename
  );
  const token = await boxAccessToken();

  const boxFile = await uploadToBox(token, file);
  const [qa, extraction] = await Promise.all([
    askBox(token, boxFile),
    extractBoxMetadata(token, boxFile, DOCUMENT_FIELDS),
  ]);

  await applyGlobalProperties(token, boxFile, {
    ...extraction.answer,
    boxAiAnswer: qa.answer,
    browserbaseAgentId: run.agentId,
    browserbaseContextId: process.env.BROWSERBASE_CONTEXT_ID,
    browserbaseRunId: run.runId,
    browserbaseSessionId: run.sessionId,
    sourceUrl: process.env.PGE_PORTAL_URL,
  });

  console.log('\n=== Box AI Q&A ===');
  console.log('Completed; the answer is stored privately in Box metadata.');

  console.log('\n=== Public-safe utility bill metadata ===');
  console.log(JSON.stringify(extraction.answer, null, 2));
  console.log('\nPrivate bill uploaded to Box and metadata applied.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
