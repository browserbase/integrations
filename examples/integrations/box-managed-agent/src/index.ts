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
    downloadedFile?: {
      filename: string;
    };
  };
};

async function runAgent() {
  const { runId } = await browserbase.agents.runs.create({
    agentId: process.env.BROWSERBASE_AGENT_ID as string,
    task: `Visit ${process.env.PROTECTED_PAGE_URL}. Using the authenticated browser session, download the PDF with the control named "${process.env.PROTECTED_PDF_LINK_TEXT}". Confirm the file is downloaded before finishing.`,
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

      console.log(
        `Inspect the Agent session: https://browserbase.com/sessions/${run.sessionId}`
      );
      console.log('Agent result:', JSON.stringify(run.result, null, 2));
      return run;
    }

    await new Promise(resolve => setTimeout(resolve, 2_000));
  }
}

async function main() {
  console.log(
    'Starting authenticated Browserbase Agent + Box document intake...'
  );
  const run = await runAgent();
  const agentResult = run.result as AgentResult | undefined;
  const expectedFilename = agentResult?.output?.downloadedFile?.filename;
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
    browserbaseAgentId: run.agentId,
    browserbaseContextId: process.env.BROWSERBASE_CONTEXT_ID,
    browserbaseRunId: run.runId,
    browserbaseSessionId: run.sessionId,
    sourceUrl: process.env.PROTECTED_PAGE_URL,
  });

  console.log('\n=== Box AI Q&A ===');
  console.log(qa.answer);
  if (qa.citations?.length) {
    console.log('Citations:');
    for (const citation of qa.citations) {
      console.log(
        `- ${citation.name ?? citation.id}: ${citation.content ?? ''}`
      );
    }
  }

  console.log('\n=== Extracted document metadata ===');
  console.log(JSON.stringify(extraction, null, 2));
  console.log('\nBox file:');
  console.log(`https://app.box.com/file/${boxFile.id}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
