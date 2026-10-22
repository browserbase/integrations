# Arize AX Integration

Use Browserbase as a **tool** for an agent, and trace every tool call with [Arize AX](https://arize.com/docs/ax).

## Overview

This integration makes Browserbase a **tool** an agent can call — here a `load_page` tool that fetches a page's content as markdown via the Browserbase [Fetch API](https://www.browserbase.com/search) (no full browser needed). The agent uses tool calling to perform a task (e.g. read a page and summarize it), and **Arize AX traces the whole run** so you can debug, monitor, and evaluate it.

Arize AX is an observability and evaluation platform for AI applications. It ingests [OpenTelemetry](https://opentelemetry.io/) traces via [OpenInference](https://github.com/Arize-ai/openinference), so each part of the agent shows up as a span:

- **LLM spans** — every OpenAI chat completion (captured automatically), with token usage and cost
- **Tool spans** — the Browserbase `load_page` (Fetch API) call, with the URL in and page markdown out
- **Chain span** — groups the whole agent run; token usage and cost roll up to the trace

## Setup

Requires **Node.js 18.19+** (or 20.6+) — the OpenTelemetry dependencies set this baseline.

```bash
npm install
cp .env.example .env   # then fill in your keys
```

| Variable                 | Where to find it                                 |
| ------------------------ | ------------------------------------------------ |
| `ARIZE_SPACE_ID`         | Arize AX → Space Settings                        |
| `ARIZE_API_KEY`          | Arize AX → Space Settings                        |
| `ARIZE_PROJECT_NAME`     | Any name; groups traces in AX (optional)         |
| `BROWSERBASE_API_KEY`    | [Browserbase dashboard](https://browserbase.com) |
| `OPENAI_API_KEY`         | OpenAI dashboard                                 |

## Run

```bash
npm start
# or ask your own question:
npm start "Read https://docs.browserbase.com and list the main products."
```

The agent browses with Browserbase, prints an answer, and the trace appears in your Arize AX project as a `CHAIN → LLM → TOOL(load_page)` tree.

## Files

- [`src/instrumentation.ts`](src/instrumentation.ts) — Arize AX / OpenTelemetry setup (OTLP exporter, OpenAI instrumentation). Must be imported before `openai`.
- [`src/agent.ts`](src/agent.ts) — the tool-calling agent: a loop over the Browserbase `load_page` tool, with manual `CHAIN` and `TOOL` spans.

---

You've integrated Browserbase with Arize AX! Use Browserbase as a tool to build composable agents that perform tasks like data extraction and RAG — and let Arize AX trace and evaluate every tool call and token.
