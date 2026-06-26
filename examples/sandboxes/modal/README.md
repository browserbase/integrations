# Browser agent in a Modal Function

Run a small [Anthropic](https://www.anthropic.com) agent loop inside a
[Modal](https://modal.com) Function whose **only tool** is the
[`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI. The browser itself never runs in the Function — `browse` drives a **remote**
browser on [Browserbase](https://www.browserbase.com) over CDP.

## What it is

A Modal Function is a great place to run an **agent loop**, but a Firecracker
sandbox is a poor place to run a *browser*: it has a datacenter IP (often
blocked), no fingerprint hardening, and no CAPTCHA solving. Bundling Playwright +
Chromium into the image doesn't help — it still browses *from the datacenter IP*,
and it bloats the image and slows cold starts.

So this example keeps the browser **out** of the Function. The Function runs a
Claude tool-use loop; the model's one tool shells out to `browse`, which connects
to a remote Browserbase browser over CDP.

```
┌──────────────────────────────┐    CDP over wss    ┌────────────────────────┐
│  Modal Function              │ ─────────────────▶ │  Browserbase browser   │
│  Claude agent loop           │                    │  (runs the real Chrome,│
│  tool: `browse ... --remote` │ ◀───────────────── │   returns page data)   │
└──────────────────────────────┘    page data       └────────────────────────┘
```

The agent's default task is a deep-research example: pull the most recent 10-Q
filing for Snowflake, Datadog, and MongoDB from SEC EDGAR and return a comparison
of their quarterly revenue, growth, RPO, and top risk factor. The agent plans its
own steps — the prompt has no site-specific instructions. Override the goal with
`--task "..."`.

## Files

- `browsecli_in_modal.py` — the annotated Modal example (literate style; the `#`
  prose renders as the gallery page). Builds the image from `node:20-slim`,
  installs `browse` + `anthropic`, runs the agent loop in a Function, exposes a
  `local_entrypoint`.
- `.env.example` — the two env vars the Function reads (`ANTHROPIC_API_KEY`,
  `BROWSERBASE_API_KEY`).

## How to run

1. Install Modal and authenticate:

   ```bash
   pip install modal
   modal setup
   ```

2. Provide credentials. The Function reads them from your local env at launch:

   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   export BROWSERBASE_API_KEY=bb_live_...
   ```

   Get them at https://console.anthropic.com and https://www.browserbase.com/settings.

3. Run it:

   ```bash
   modal run browsecli_in_modal.py
   # → prints each `browse` command, then ===== FINAL ANSWER ===== <summary>
   ```

   Give it a different goal with `modal run browsecli_in_modal.py --task "..."`.

## CI guard (important for the gallery)

Modal runs **every** gallery example live on each push, where no credentials
exist. The Function is guarded: if either key is unset it prints a clear
"skipping live run" message and returns cleanly instead of failing CI. With keys
present, the live run is cheap — one short remote session.

## Note on protected sites

This example uses a plain `--remote` browser, which works on **any** Browserbase
plan. To reach sites behind aggressive bot-detection, Browserbase also offers
Verified browsers (residential IP + automatic CAPTCHA solving), which require a
Scale plan — see https://www.browserbase.com/pricing.
