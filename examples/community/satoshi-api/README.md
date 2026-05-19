# Satoshi API + Browserbase

Give a Browserbase Stagehand agent live Bitcoin fee intelligence before it acts
on a payment, wallet, exchange, or checkout page.

Satoshi API is a self-hostable Bitcoin REST API and hosted service at
`https://bitcoinsapi.com`. This example fetches a free fee recommendation from
Satoshi API, starts a Browserbase browser session, opens a live Bitcoin fee
page, and prints the fee-aware decision next to the Browserbase session ID.

## Use Cases

- Check whether a Bitcoin payment flow should send now or wait.
- Add fee context to wallet and checkout QA runs.
- Pair browser automation with x402-paid Bitcoin data for accountless agents.
- Store the Browserbase session replay next to the fee decision for audit logs.

## Prerequisites

- Node.js 18 or newer.
- A Browserbase API key.
- Optional: a free Satoshi API key for higher limits.

## Setup

```bash
cp .env.example .env
npm install
npm run start
```

The no-token quickstart uses:

```text
GET https://bitcoinsapi.com/api/v1/fees/recommended
```

For x402 pay-per-call analysis, start with the paid route:

```text
GET https://bitcoinsapi.com/api/v1/fees/now
```

## Environment Variables

| Variable                 | Required  | Description                                                            |
| ------------------------ | --------- | ---------------------------------------------------------------------- |
| `BROWSERBASE_API_KEY`    | Yes       | Browserbase API key used by Stagehand.                                 |
| `BROWSERBASE_PROJECT_ID` | Sometimes | Browserbase project ID if your account or SDK setup requires it.       |
| `BROWSERBASE_MODEL`      | No        | Model Gateway model name. Defaults to `google/gemini-3-flash-preview`. |
| `SATOSHI_API_URL`        | No        | Defaults to `https://bitcoinsapi.com`.                                 |
| `SATOSHI_API_KEY`        | No        | Optional Satoshi API key for higher public endpoint limits.            |

## What The Example Does

1. Fetches `GET /api/v1/fees/recommended` from Satoshi API.
2. Starts a Browserbase Stagehand session.
3. Opens `https://mempool.space/` for live browser context.
4. Prints the fee decision, page title, and Browserbase session ID.

## Resources

- Satoshi API: `https://bitcoinsapi.com`
- Satoshi API source: `https://github.com/Bortlesboat/bitcoin-api`
- Browserbase docs: `https://docs.browserbase.com`
- Browserbase x402 docs:
  `https://docs.browserbase.com/integrations/x402/introduction`
