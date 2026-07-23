import { Stagehand } from '@browserbasehq/stagehand';
import { config, sources, type Source } from './config.js';
import { responseError } from './http.js';

type BrowserbaseDownload = {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  createdAt: string;
};

export type DownloadedFile = BrowserbaseDownload & {
  bytes: ArrayBuffer;
};

async function triggerDownload(stagehand: Stagehand, source: Source) {
  const page = stagehand.context.pages()[0];
  console.log(`\nOpening ${source.pageUrl}`);
  await page.goto(source.pageUrl, {
    waitUntil: 'domcontentloaded',
    timeoutMs: 60_000,
  });

  const [action] = await stagehand.observe(
    `Find the link named "${source.linkText}" that downloads the document.`
  );
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
    { headers: { 'x-bb-api-key': config.browserbaseApiKey } }
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
  createdAfter: string
): Promise<BrowserbaseDownload[]> {
  const expectedFilenames = sources.map(source => source.downloadName);
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
        'x-bb-api-key': config.browserbaseApiKey,
        accept: 'application/octet-stream',
      },
    }
  );

  if (!response.ok) {
    await responseError(response, `Retrieving ${download.filename}`);
  }

  return { ...download, bytes: await response.arrayBuffer() };
}

export async function downloadWithStagehand() {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: config.browserbaseApiKey,
  });
  await stagehand.init();
  const sessionId = stagehand.browserbaseSessionID;
  if (!sessionId) {
    await stagehand.close();
    throw new Error('Stagehand did not return a Browserbase session ID.');
  }

  try {
    await stagehand.context.pages()[0].sendCDP('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: 'downloads',
      eventsEnabled: true,
    });
    console.log(
      `Watch the browser live: https://browserbase.com/sessions/${sessionId}`
    );

    const startedAt = new Date(Date.now() - 1_000).toISOString();
    for (const source of sources) {
      await triggerDownload(stagehand, source);
    }

    const downloads = await waitForDownloads(sessionId, startedAt);
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
