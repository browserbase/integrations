import 'dotenv/config';

import Browserbase from '@browserbasehq/sdk';
import {
  applyGlobalProperties,
  askBox,
  boxAccessToken,
  extractBoxMetadata,
  LABEL_FIELDS,
  SDS_FIELDS,
  uploadToBox,
} from './box.js';
import { decideCompliance } from './compliance.js';
import { getAgentDownloads } from './downloads.js';

const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
});

const sources = [
  {
    role: 'sds',
    pageUrl:
      process.env.SDS_PAGE_URL ??
      'https://www.thecloroxcompany.com/sds/clorox-disinfecting-wipes1-fresh-scent/',
    linkText: process.env.SDS_LINK_TEXT ?? 'Download Safety Data Sheet',
  },
  {
    role: 'label',
    pageUrl:
      process.env.LABEL_PAGE_URL ??
      'https://www.epa.gov/pesticide-labels/sample-pesticide-label-current-and-ghs-requirements',
    linkText:
      process.env.LABEL_LINK_TEXT ??
      'Sample Pesticide Label with Current and GHS Requirements',
  },
] as const;

type AgentResult = {
  output?: {
    downloadedFiles?: Array<{
      filename: string;
    }>;
  };
};

async function runAgent() {
  const { runId } = await browserbase.agents.runs.create({
    agentId: process.env.BROWSERBASE_AGENT_ID as string,
    task: `Download these two compliance documents in this exact order:

1. Visit ${sources[0].pageUrl} and click the link named "${sources[0].linkText}".
2. After the first download begins, visit ${sources[1].pageUrl} and click the link named "${sources[1].linkText}".

Use the browser for both downloads and confirm both files are downloaded before finishing.`,
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
  console.log('Starting Browserbase managed Agent + Box compliance intake...');
  const run = await runAgent();
  const agentResult = run.result as AgentResult | undefined;
  const expectedFilenames = agentResult?.output?.downloadedFiles?.map(
    file => file.filename
  );
  if (expectedFilenames?.length !== sources.length) {
    throw new Error(
      'Browserbase Agent result did not include both downloaded filenames.'
    );
  }

  const files = await getAgentDownloads(
    run.sessionId as string,
    expectedFilenames
  );
  const token = await boxAccessToken();

  const [sdsFile, labelFile] = await Promise.all([
    uploadToBox(token, files[0], 'sds'),
    uploadToBox(token, files[1], 'label'),
  ]);
  const [qa, sdsExtraction, labelExtraction] = await Promise.all([
    askBox(token, sdsFile),
    extractBoxMetadata(token, sdsFile, SDS_FIELDS),
    extractBoxMetadata(token, labelFile, LABEL_FIELDS),
  ]);
  const decision = decideCompliance(
    sdsExtraction.answer,
    labelExtraction.answer
  );

  await Promise.all([
    applyGlobalProperties(token, sdsFile, {
      ...sdsExtraction.answer,
      browserbaseAgentId: run.agentId,
      browserbaseRunId: run.runId,
      browserbaseSessionId: run.sessionId,
      documentRole: 'safety_data_sheet',
      complianceStatus: decision.status,
      sourceUrl: sources[0].pageUrl,
    }),
    applyGlobalProperties(token, labelFile, {
      ...labelExtraction.answer,
      browserbaseAgentId: run.agentId,
      browserbaseRunId: run.runId,
      browserbaseSessionId: run.sessionId,
      documentRole: 'product_label',
      complianceStatus: decision.status,
      sourceUrl: sources[1].pageUrl,
    }),
  ]);

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

  console.log('\n=== Extracted SDS metadata ===');
  console.log(JSON.stringify(sdsExtraction, null, 2));
  console.log('\n=== Extracted label metadata ===');
  console.log(JSON.stringify(labelExtraction, null, 2));
  console.log('\n=== Compliance decision ===');
  console.log(JSON.stringify(decision, null, 2));
  console.log('\nBox files:');
  console.log(`- https://app.box.com/file/${sdsFile.id}`);
  console.log(`- https://app.box.com/file/${labelFile.id}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
