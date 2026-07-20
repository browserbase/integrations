# Browserbase for Eve

An [Eve extension](https://eve.dev/docs/extensions) that gives an agent
Browserbase Search and Fetch plus a persistent Browserbase browser powered by
[Stagehand](https://docs.stagehand.dev/). It exposes Stagehand's focused
primitives (`act`, `observe`, and `extract`) plus navigation and autonomous agent
tools.

## Install

```bash
pnpm add @browserbasehq/eve
```

Add your credentials to the consuming Eve app:

```bash
BROWSERBASE_API_KEY=bb_live_...
```

## Mount the extension

The filename under `agent/extensions/` becomes the tool namespace. Mounting the
extension as `browserbase.ts` creates tools such as `browserbase__search`,
`browserbase__fetch`, `browserbase__create_session`, and
`browserbase__navigate`.

```ts
// agent/extensions/browserbase.ts
import browserbase from '@browserbasehq/eve';

export default browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
  model: 'openai/gpt-5.4-mini',
});
```

Start Eve and give the agent a browser task:

```bash
npx eve dev
```

```text
Open https://news.ycombinator.com and extract the titles and URLs of the first
five stories.
```

The extension keeps the Browserbase session ID in Eve's durable per-session
state. Each tool reconnects to that browser, performs one operation, and
disconnects without terminating it. `browserbase__create_session` creates or
reconnects the browser explicitly, and `browserbase__stop_session` terminates it.

## Tools

| Tool             | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `search`         | Find relevant public web pages with Browserbase Search.   |
| `fetch`          | Retrieve raw, markdown, or structured page content.       |
| `create_session` | Create or reconnect the Browserbase session.              |
| `stop_session`   | Stop the Browserbase session and release resources.       |
| `navigate`       | Open a URL in the current browser.                        |
| `observe`        | Find relevant elements and candidate actions.             |
| `act`            | Perform one natural-language page interaction.            |
| `extract`        | Return data validated against a supplied JSON Schema.     |
| `agent`          | Run a multi-step autonomous Stagehand task.               |

Use Search → Fetch → browser as an escalation path: discover sources cheaply,
retrieve straightforward content without a session, and create a browser only
when the page requires JavaScript or interaction. Fetch supports Browserbase's
`raw`, `markdown`, and schema-driven `json` formats.

For predictable and efficient runs, use `create_session` → `navigate` →
`observe` → `act` or `extract`, then `stop_session`. Reserve `agent` for
workflows that need Stagehand to plan several steps on its own.

## Configuration

| Option                  | Default               | Description                                             |
| ----------------------- | --------------------- | ------------------------------------------------------- |
| `apiKey`                | required              | Browserbase API key for browsers and Model Gateway.     |
| `model`                 | `openai/gpt-5.4-mini` | Stagehand Model Gateway model identifier.               |
| `sessionTimeoutSeconds` | `900`                 | Session timeout, from 60 to 21,600 seconds.             |
| `proxies`               | `false`               | Enable Browserbase proxies for new sessions.            |

Stagehand runs through Browserbase Model Gateway, so consumers do not need an
OpenAI or other model-provider API key. The Browserbase API key covers both the
browser session and Stagehand inference.

The extension uses Browserbase `keepAlive` sessions so it can reconnect across
Eve workflow steps and Vercel function invocations. Close the session after the
task to avoid leaving billable browser time running. Keep-alive availability
depends on your Browserbase plan.

## Build

```bash
nvm use
pnpm install
pnpm check
```

Eve requires Node.js 24 or newer. This directory's `.nvmrc` pins Node 24.16.0;
run `nvm install 24.16.0` first if needed.

`eve extension build` writes the publishable extension and type declarations to
`dist/`.

## Example agent

The sibling [`eve-example`](../eve-example/) directory contains a runnable Eve
agent that mounts this package locally. It includes the agent instructions,
environment template, and a Browserbase research prompt for a complete smoke
test.
