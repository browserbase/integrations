import { Stagehand } from '@browserbasehq/stagehand';
import 'dotenv/config';

type JsonObject = Record<string, unknown>;

interface SatoshiEnvelope {
  data?: JsonObject;
  meta?: JsonObject;
  error?: unknown;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function getObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getEstimate(
  data: Record<string, unknown>,
  keys: string[]
): number | undefined {
  const estimates = getObject(data.estimates);
  for (const key of keys) {
    const estimate = estimates ? getNumber(estimates[key]) : undefined;
    if (estimate !== undefined) {
      return estimate;
    }

    const topLevel = getNumber(data[key]);
    if (topLevel !== undefined) {
      return topLevel;
    }
  }

  return undefined;
}

function summarizeFeeDecision(data: JsonObject): string {
  const action =
    getString(data.action) ??
    getString(data.recommendation) ??
    getString(data.decision) ??
    'inspect_fee_context';

  const summary =
    getString(data.summary) ??
    getString(data.message) ??
    getString(data.reason) ??
    'Satoshi API returned live Bitcoin fee context for the browser agent.';

  const nextBlockFee = getEstimate(data, [
    '1',
    'high',
    'fastestFee',
    'fastest_fee',
    'nextBlockFee',
    'next_block_fee_sat_vb',
  ]);

  const feeLine =
    nextBlockFee === undefined
      ? ''
      : ` Next-block fee baseline: ${nextBlockFee} sat/vB.`;

  return `${action}: ${summary}${feeLine}`;
}

async function fetchSatoshiFees(): Promise<SatoshiEnvelope> {
  const baseUrl = process.env.SATOSHI_API_URL ?? 'https://bitcoinsapi.com';
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (process.env.SATOSHI_API_KEY) {
    headers['X-API-Key'] = process.env.SATOSHI_API_KEY;
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, '')}/api/v1/fees/recommended`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(
      `Satoshi API returned HTTP ${response.status}: ${await response.text()}`
    );
  }

  const payload = (await response.json()) as SatoshiEnvelope;
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Satoshi API response did not include a data object.');
  }

  return payload;
}

async function main() {
  const feePayload = await fetchSatoshiFees();
  const feeDecision = summarizeFeeDecision(feePayload.data ?? {});

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    model: process.env.BROWSERBASE_MODEL ?? 'google/gemini-3-flash-preview',
  });

  await stagehand.init();

  try {
    const page = stagehand.context.pages()[0];
    if (!page) {
      throw new Error('Browserbase session did not create an initial page.');
    }

    await page.goto('https://mempool.space/', {
      waitUntil: 'domcontentloaded',
    });

    console.log('Satoshi API fee decision');
    console.log(`- ${feeDecision}`);
    console.log('');
    console.log('Browserbase session');
    console.log(`- session_id: ${stagehand.browserbaseSessionID ?? 'unknown'}`);
    console.log(`- page_title: ${await page.title()}`);
  } finally {
    await stagehand.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
