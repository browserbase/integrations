# ElevenLabs + Browserbase

Standalone prototype for a shared Browserbase session controlled by a local Claude-based browser controller, with ElevenLabs as the voice shell.

## Required environment variables

Create `.env.local` or `.env` with:

```bash
ANTHROPIC_API_KEY=
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=
```

Optional:

```bash
BROWSE_BIN=browse
```

## Run locally

```bash
pnpm install
pnpm dev
```

Open:

```text
http://127.0.0.1:3001
```

The controller expects the Browserbase Browse CLI to be installed and available on your `PATH`. If it is installed somewhere else, point `BROWSE_BIN` at it.

## ElevenLabs agent setup

The frontend registers one client tool:

- `control_demo`

Suggested tool description for your ElevenLabs agent:

> Use this tool whenever the user asks you to navigate, click, open, read, create, edit, or continue operating the live browser session. Pass one high-level instruction at a time.

Suggested system guidance:

> You are the voice interface for a live Browserbase browser controller. The browser controller owns all navigation, clicking, reading, and page state. Use `control_demo` once for each new browser instruction from the user. After `control_demo` returns `accepted`, `running`, `queued`, or `interrupting`, give at most one short acknowledgement, then wait for controller updates. Never ask "are you there" while the controller is busy. When the controller returns `completed`, answer concisely using the final summary and current page state. When the controller returns `blocked`, ask the clarification once instead of retrying the same tool call.

Do not pass this as a runtime prompt override unless that override is explicitly enabled in the ElevenLabs agent settings; otherwise the session may immediately disconnect.

## Controller model

The local controller uses Claude Agent SDK as a step planner pinned to `claude-opus-4-7`, while browser execution runs through the Browserbase `browse` CLI against the same persistent Browserbase session used for the live iframe.

That means the controller plans from `browse snapshot` output, clicks by stable refs like `@0-5`, and can follow tab changes through the CLI instead of relying on fuzzy Playwright text matching.
