export type DownloadedFile = {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  createdAt: string;
  bytes: ArrayBuffer;
};

type BrowserbaseDownload = Omit<DownloadedFile, 'bytes'>;

async function responseError(response: Response, action: string) {
  throw new Error(
    `${action} failed (${response.status} ${response.statusText}): ${await response.text()}`
  );
}

async function listDownloads(
  sessionId: string
): Promise<BrowserbaseDownload[]> {
  const query = new URLSearchParams({ sessionId, limit: '20' });
  const response = await fetch(
    `https://api.browserbase.com/v1/downloads?${query}`,
    {
      headers: {
        'x-bb-api-key': process.env.BROWSERBASE_API_KEY as string,
      },
    }
  );

  if (!response.ok) {
    await responseError(response, 'Listing Browserbase Agent downloads');
  }

  const body = (await response.json()) as {
    downloads: BrowserbaseDownload[];
  };
  return body.downloads.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function getDownload(
  download: BrowserbaseDownload
): Promise<DownloadedFile> {
  const response = await fetch(
    `https://api.browserbase.com/v1/downloads/${download.id}`,
    {
      headers: {
        'x-bb-api-key': process.env.BROWSERBASE_API_KEY as string,
        accept: 'application/octet-stream',
      },
    }
  );

  if (!response.ok) {
    await responseError(response, `Retrieving ${download.filename}`);
  }

  return { ...download, bytes: await response.arrayBuffer() };
}

export async function getAgentDownload(
  sessionId: string,
  expectedFilename: string
): Promise<DownloadedFile> {
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    const downloads = await listDownloads(sessionId);
    const matched = downloads.find(
      download => download.filename === expectedFilename
    );
    if (matched) {
      console.log('\n=== Browserbase Agent downloads ===');
      for (const download of downloads) {
        console.log(
          `- ${download.filename} (${download.mimeType}, ${download.size} bytes)`
        );
      }
      return getDownload(matched);
    }

    console.log('Waiting for Browserbase cloud sync...');
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }

  throw new Error(
    `Browserbase did not sync the Agent download within 30 seconds: ${expectedFilename}.`
  );
}
