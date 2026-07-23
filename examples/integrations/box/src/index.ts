import 'dotenv/config';

import { Stagehand } from '@browserbasehq/stagehand';
import {
  decideCompliance,
  metadataValues,
  type ExtractionAnswer,
} from './compliance.js';

type Source = {
  role: 'sds' | 'label';
  pageUrl: string;
  linkText: string;
  downloadName: string;
};

type BrowserbaseDownload = {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  createdAt: string;
};

type DownloadedFile = BrowserbaseDownload & {
  bytes: ArrayBuffer;
};

type BoxFile = {
  id: string;
  name: string;
};

type BoxAiAskResponse = {
  answer: string;
  citations?: Array<{
    id: string;
    name?: string;
    content?: string;
    type: string;
  }>;
};

type BoxAiExtractResponse = {
  answer: ExtractionAnswer;
  confidence_score?: Record<string, unknown>;
  reference?: Record<string, unknown>;
};

const SDS_FIELDS = [
  field(
    'productName',
    'Product name',
    'The product identifier or product name.'
  ),
  field('manufacturer', 'Manufacturer', 'The supplier or manufacturer name.'),
  field(
    'epaRegistrationNumber',
    'EPA registration number',
    'The EPA pesticide registration number, preserving its printed punctuation.'
  ),
  field('revisionDate', 'Revision date', 'The document revision date.', 'date'),
  field(
    'emergencyPhone',
    'Emergency phone',
    'The medical or transportation emergency phone number.'
  ),
  field('recommendedUse', 'Recommended use', 'The recommended product use.'),
  field('hazards', 'Hazards', 'The primary hazards or hazard statements.'),
  field('ppe', 'PPE', 'Required personal protective equipment.'),
  field(
    'storageRequirements',
    'Storage requirements',
    'The conditions required for safe storage.'
  ),
];

const LABEL_FIELDS = [
  field('productName', 'Product name', 'The product name shown on the label.'),
  field(
    'epaRegistrationNumber',
    'EPA registration number',
    'The EPA registration number shown on the label, preserving punctuation.'
  ),
  field(
    'signalWord',
    'Signal word',
    'The signal word, such as Danger or Caution.'
  ),
  field('activeIngredients', 'Active ingredients', 'The active ingredients.'),
  field(
    'contactTime',
    'Contact time',
    'The required wet contact or dwell time.'
  ),
  field('firstAid', 'First aid', 'The first-aid instructions.'),
  field('directions', 'Directions', 'The directions for use.'),
  field(
    'storageAndDisposal',
    'Storage and disposal',
    'The storage and disposal instructions.'
  ),
];

function field(
  key: string,
  displayName: string,
  prompt: string,
  type = 'string'
) {
  return { key, displayName, prompt, type };
}

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sources(): Source[] {
  return [
    {
      role: 'sds',
      pageUrl:
        process.env.SDS_PAGE_URL ??
        'https://www.thecloroxcompany.com/sds/clorox-disinfecting-wipes1-fresh-scent/',
      linkText: process.env.SDS_LINK_TEXT ?? 'Download Safety Data Sheet',
      downloadName: 'clorox-disinfecting-wipes-sds.pdf',
    },
    {
      role: 'label',
      pageUrl:
        process.env.LABEL_PAGE_URL ??
        'https://www.epa.gov/safepestcontrol/why-read-labels',
      linkText:
        process.env.LABEL_LINK_TEXT ?? 'How to Read a Disinfectant Label',
      downloadName: 'epa-disinfectant-label-guide.png',
    },
  ];
}

async function responseError(response: Response, action: string) {
  const body = await response.text();
  throw new Error(
    `${action} failed (${response.status} ${response.statusText}): ${body}`
  );
}

async function triggerDownload(stagehand: Stagehand, source: Source) {
  const page = stagehand.context.pages()[0];
  console.log(`\nOpening ${source.pageUrl}`);
  await page.goto(source.pageUrl, {
    waitUntil: 'domcontentloaded',
    timeoutMs: 60_000,
  });

  const actions = await stagehand.observe(
    `Find the link named "${source.linkText}" that downloads the document.`
  );
  const action = actions[0];
  if (!action) {
    throw new Error(`Stagehand could not find the ${source.linkText} link.`);
  }

  await page.evaluate(
    ({ selector, downloadName }) => {
      const xpath = selector.replace(/^xpath=/, '');
      const element =
        selector.startsWith('/') || selector.startsWith('xpath=')
          ? (document.evaluate(
              xpath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue as Element | null)
          : document.querySelector(selector);

      if (!element) {
        throw new Error(`Could not resolve Stagehand selector: ${selector}`);
      }
      element.setAttribute('download', downloadName);
    },
    { selector: action.selector, downloadName: source.downloadName }
  );
  await stagehand.act(action);
  console.log(`Stagehand requested ${source.downloadName}`);
}

async function listDownloads(
  sessionId: string,
  createdAfter: string
): Promise<BrowserbaseDownload[]> {
  const query = new URLSearchParams({
    sessionId,
    createdAfter,
    limit: '20',
  });
  const response = await fetch(
    `https://api.browserbase.com/v1/downloads?${query}`,
    { headers: { 'x-bb-api-key': env('BROWSERBASE_API_KEY') } }
  );

  if (!response.ok) {
    await responseError(response, 'Listing Browserbase downloads');
  }

  const body = (await response.json()) as {
    downloads: BrowserbaseDownload[];
  };
  return body.downloads.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function waitForDownloads(
  sessionId: string,
  createdAfter: string,
  expectedFilenames: string[]
): Promise<BrowserbaseDownload[]> {
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    const downloads = await listDownloads(sessionId, createdAfter);
    const matched = expectedFilenames.flatMap(filename => {
      const download = downloads.find(
        candidate => candidate.filename === filename
      );
      return download ? [download] : [];
    });

    if (matched.length === expectedFilenames.length) {
      return matched;
    }

    console.log(
      `Waiting for Browserbase cloud sync (${matched.length}/${expectedFilenames.length})...`
    );
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }

  throw new Error(
    `Browserbase did not sync the expected files within 30 seconds: ${expectedFilenames.join(', ')}.`
  );
}

async function getDownload(
  download: BrowserbaseDownload
): Promise<DownloadedFile> {
  const response = await fetch(
    `https://api.browserbase.com/v1/downloads/${download.id}`,
    {
      headers: {
        'x-bb-api-key': env('BROWSERBASE_API_KEY'),
        accept: 'application/octet-stream',
      },
    }
  );

  if (!response.ok) {
    await responseError(response, `Retrieving ${download.filename}`);
  }

  return {
    ...download,
    bytes: await response.arrayBuffer(),
  };
}

async function boxAccessToken(): Promise<string> {
  const response = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env('BOX_CLIENT_ID'),
      client_secret: env('BOX_CLIENT_SECRET'),
      box_subject_type: 'enterprise',
      box_subject_id: env('BOX_ENTERPRISE_ID'),
    }),
  });

  if (!response.ok) {
    await responseError(response, 'Authenticating with Box');
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error('Box did not return an access token.');
  }

  return body.access_token;
}

function uniqueBoxName(filename: string, role: Source['role']): string {
  const extensionIndex = filename.lastIndexOf('.');
  const extension = extensionIndex >= 0 ? filename.slice(extensionIndex) : '';
  return `browserbase-${role}-${Date.now()}${extension}`;
}

async function uploadToBox(
  token: string,
  file: DownloadedFile,
  role: Source['role'],
  folderId: string
): Promise<BoxFile> {
  const name = uniqueBoxName(file.filename, role);
  const form = new FormData();
  form.append(
    'attributes',
    JSON.stringify({
      name,
      parent: { id: folderId },
    })
  );
  form.append('file', new Blob([file.bytes], { type: file.mimeType }), name);

  const response = await fetch('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    await responseError(response, `Uploading ${file.filename} to Box`);
  }

  const body = (await response.json()) as { entries: BoxFile[] };
  const uploaded = body.entries[0];
  if (!uploaded) {
    throw new Error(
      `Box did not return an uploaded file for ${file.filename}.`
    );
  }

  console.log(`Uploaded ${uploaded.name} to Box (file ${uploaded.id})`);
  return uploaded;
}

async function boxAiRequest<T>(
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`https://api.box.com/2.0${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    const retryable =
      response.status === 400 ||
      response.status === 412 ||
      response.status === 429 ||
      response.status >= 500;
    if (attempt < maxAttempts && retryable) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfter =
        retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
      const delayMs =
        Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter * 1_000
          : Math.min(2 ** attempt * 1_000, 30_000);
      console.log(
        `Box AI is not ready yet; retrying in ${Math.ceil(delayMs / 1_000)}s ` +
          `(${attempt}/${maxAttempts})...`
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    await responseError(response, `Calling Box AI ${path}`);
  }

  throw new Error(`Calling Box AI ${path} exhausted all retries.`);
}

async function askBox(token: string, file: BoxFile) {
  return boxAiRequest<BoxAiAskResponse>(token, '/ai/ask', {
    mode: 'single_item_qa',
    prompt:
      'Summarize the safe handling, storage, personal protective equipment, and emergency response requirements in this safety data sheet.',
    items: [{ type: 'file', id: file.id }],
    include_citations: true,
  });
}

async function extractBoxMetadata(
  token: string,
  file: BoxFile,
  fields: ReturnType<typeof field>[]
) {
  return boxAiRequest<BoxAiExtractResponse>(token, '/ai/extract_structured', {
    items: [{ type: 'file', id: file.id }],
    fields,
    include_confidence_score: true,
    include_reference: true,
  });
}

async function applyGlobalProperties(
  token: string,
  file: BoxFile,
  properties: Record<string, unknown>
) {
  const response = await fetch(
    `https://api.box.com/2.0/files/${file.id}/metadata/global/properties`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(metadataValues(properties)),
    }
  );

  if (!response.ok) {
    await responseError(response, `Applying metadata to ${file.name}`);
  }
}

async function downloadWithStagehand(): Promise<{
  sessionId: string;
  stagehand: Stagehand;
  files: DownloadedFile[];
}> {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: env('BROWSERBASE_API_KEY'),
    model: 'google/gemini-2.5-flash',
  });
  await stagehand.init();
  const sessionId = stagehand.browserbaseSessionID;
  if (!sessionId) {
    await stagehand.close();
    throw new Error('Stagehand did not return a Browserbase session ID.');
  }

  try {
    const context = stagehand.context;
    const page = context.pages()[0];
    await page.sendCDP('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: 'downloads',
      eventsEnabled: true,
    });

    console.log(
      `Watch the browser live: https://browserbase.com/sessions/${sessionId}`
    );

    const startedAt = new Date(Date.now() - 1_000).toISOString();
    const configuredSources = sources();
    for (const source of configuredSources) {
      await triggerDownload(stagehand, source);
    }

    const downloads = await waitForDownloads(
      sessionId,
      startedAt,
      configuredSources.map(source => source.downloadName)
    );
    const files = await Promise.all(downloads.map(getDownload));
    for (const file of files) {
      console.log(`Browserbase synced ${file.filename} (${file.size} bytes)`);
    }
    return { sessionId, stagehand, files };
  } catch (error) {
    await stagehand.close();
    throw error;
  }
}

async function main() {
  console.log('Starting Browserbase + Box compliance intake...');
  const folderId = env('BOX_FOLDER_ID');
  const token = await boxAccessToken();
  const configuredSources = sources();
  const { stagehand, sessionId, files } = await downloadWithStagehand();

  try {
    if (files.length < configuredSources.length) {
      throw new Error(
        `Expected ${configuredSources.length} files, received ${files.length}.`
      );
    }

    const [sdsFile, labelFile] = await Promise.all([
      uploadToBox(token, files[0], 'sds', folderId),
      uploadToBox(token, files[1], 'label', folderId),
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
        browserbaseSessionId: sessionId,
        documentRole: 'safety_data_sheet',
        complianceStatus: decision.status,
        sourceUrl: configuredSources[0].pageUrl,
      }),
      applyGlobalProperties(token, labelFile, {
        ...labelExtraction.answer,
        browserbaseSessionId: sessionId,
        documentRole: 'product_label',
        complianceStatus: decision.status,
        sourceUrl: configuredSources[1].pageUrl,
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
    console.log('\n=== OCR-extracted label metadata ===');
    console.log(JSON.stringify(labelExtraction, null, 2));
    console.log('\n=== Compliance decision ===');
    console.log(JSON.stringify(decision, null, 2));
    console.log('\nBox files:');
    console.log(`- https://app.box.com/file/${sdsFile.id}`);
    console.log(`- https://app.box.com/file/${labelFile.id}`);
  } finally {
    await stagehand.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
