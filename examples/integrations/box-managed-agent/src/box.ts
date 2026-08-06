import type { DownloadedFile } from './downloads.js';

type ExtractionAnswer = Record<string, unknown>;

export type BoxFile = {
  id: string;
  name: string;
};

export type BoxAiAskResponse = {
  answer: string;
};

export type BoxAiExtractResponse = {
  answer: ExtractionAnswer;
  confidence_score?: Record<string, unknown>;
};

async function responseError(response: Response, action: string) {
  throw new Error(
    `${action} failed (${response.status} ${response.statusText}): ${await response.text()}`
  );
}

function field(
  key: string,
  displayName: string,
  prompt: string,
  type = 'string'
) {
  return { key, displayName, prompt, type };
}

export const DOCUMENT_FIELDS = [
  field(
    'statementDate',
    'Statement date',
    'The date the utility statement was issued.',
    'date'
  ),
  field(
    'billingPeriod',
    'Billing period',
    'The service start and end dates for this bill.'
  ),
  field('dueDate', 'Due date', 'The date payment is due.', 'date'),
  field('amountDue', 'Amount due', 'The total amount currently due.'),
  field('previousBalance', 'Previous balance', 'The previous balance.'),
  field(
    'paymentsReceived',
    'Payments received',
    'Payments or credits received during this billing period.'
  ),
  field(
    'electricityCharges',
    'Electricity charges',
    'The current electricity charges.'
  ),
  field('gasCharges', 'Gas charges', 'The current natural gas charges.'),
  field(
    'electricityUsage',
    'Electricity usage',
    'Electricity usage for the billing period, including its unit.'
  ),
  field(
    'gasUsage',
    'Gas usage',
    'Natural gas usage for the billing period, including its unit.'
  ),
  field('ratePlan', 'Rate plan', 'The named utility rate plan.'),
];

export async function boxAccessToken(): Promise<string> {
  const response = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.BOX_CLIENT_ID as string,
      client_secret: process.env.BOX_CLIENT_SECRET as string,
      box_subject_type: 'enterprise',
      box_subject_id: process.env.BOX_ENTERPRISE_ID as string,
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

export async function uploadToBox(
  token: string,
  file: DownloadedFile
): Promise<BoxFile> {
  const extensionIndex = file.filename.lastIndexOf('.');
  const extension =
    extensionIndex >= 0 ? file.filename.slice(extensionIndex) : '';
  const name = `browserbase-agent-utility-bill-${Date.now()}${extension}`;
  const form = new FormData();
  form.append(
    'attributes',
    JSON.stringify({
      name,
      parent: { id: process.env.BOX_FOLDER_ID as string },
    })
  );
  form.append('file', new Blob([file.bytes], { type: file.mimeType }), name);

  const response = await fetch('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    await responseError(response, 'Uploading the utility bill to Box');
  }

  const body = (await response.json()) as { entries: BoxFile[] };
  const uploaded = body.entries[0];
  if (!uploaded) {
    throw new Error('Box did not return an uploaded utility bill.');
  }

  console.log('Private utility bill uploaded to Box.');
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

export function askBox(token: string, file: BoxFile) {
  return boxAiRequest<BoxAiAskResponse>(token, '/ai/ask', {
    mode: 'single_item_qa',
    prompt:
      'Return exactly one sentence containing only the billing period, amount due, due date, electricity usage, and gas usage. Do not include the customer name, service address, account number, meter number, payment method, or any other identifying information.',
    items: [{ type: 'file', id: file.id }],
  });
}

export function extractBoxMetadata(
  token: string,
  file: BoxFile,
  fields: ReturnType<typeof field>[]
) {
  return boxAiRequest<BoxAiExtractResponse>(token, '/ai/extract_structured', {
    items: [{ type: 'file', id: file.id }],
    fields,
    include_confidence_score: true,
  });
}

export async function applyGlobalProperties(
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
      body: JSON.stringify(
        Object.fromEntries(
          Object.entries(properties).flatMap(([key, value]) => {
            if (value === undefined || value === null) {
              return [];
            }
            return [
              [key, typeof value === 'string' ? value : JSON.stringify(value)],
            ];
          })
        )
      ),
    }
  );

  if (!response.ok) {
    await responseError(response, `Applying metadata to ${file.name}`);
  }
}
