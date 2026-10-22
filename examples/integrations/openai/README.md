# OpenAI Realtime + Browserbase

Give your voice agent access to the whole web.

A **voice agent** (OpenAI Realtime, speech-to-speech) talks with the user. A **browser agent** (Claude driving a Browserbase session) operates a real browser underneath it — opening sites, clicking, and reading pages. They share one live session, so what the agent says stays in sync with what it does.

The user watches the browser work live, and can interrupt or redirect at any time, just by talking.

## Required environment variables

Create `.env.local` or `.env` with:

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
```

Optional:

```bash
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
BROWSE_BIN=browse
```

## Run locally

```bash
pnpm install
pnpm dev
```

Open:

```text
http://127.0.0.1:3002
```

Click **Start voice**, allow the microphone, and just talk — ask it to open a site, search, click, or read a page.

The browser agent uses the Browserbase [Browse CLI](https://www.npmjs.com/package/browse), which must be installed and available on your `PATH`. If it lives elsewhere, point `BROWSE_BIN` at it.

## How it works

Two cooperating agents joined by a server-side connection:

- **Voice plane** — the browser connects to OpenAI Realtime over WebRTC (audio is peer-to-peer). The voice agent has one tool, `control_browser`, which it calls whenever the user wants something done on the web.
- **Server bridge** — the connect route creates the Realtime call, then attaches a server-side WebSocket to the same call so the backend can answer `control_browser` tool calls and speak the result back in the same conversation.
- **Browser plane** — one **persistent Claude agent runs for the whole call**. Each `control_browser` instruction is appended to the same conversation, so the agent remembers everything it has already opened and done (the user can say "go back to the first result and compare"). It drives the browser through compact tools (`navigate`, `click`, `type_text`, `press_key`, `go_back`, `read_page`) against a shared Browserbase session shown in the live-view iframe.

Because the tool call only returns once the browser work has actually happened — and answers are grounded in (and quoted from) the live page — the spoken conversation stays in sync with the screen instead of narrating ahead of it.

This is a prototype meant to inspire people building voice agents: the same pattern works with any speech-to-speech voice runtime in front of a Browserbase-backed browser agent.
