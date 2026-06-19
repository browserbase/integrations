# BrowseCLI in a Modal Function

Run the [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI inside a [Modal](https://modal.com) Function to reach **any** website — even
Cloudflare/Akamai/DataDome-protected ones — via a **Verified Browserbase browser**
(residential IP, no datacenter blocking, auto CAPTCHA-solve).

## What it is

Modal is great at running your **agent loop**, but a Firecracker sandbox can't
browse the real web reliably: it has a **datacenter IP** (instantly blocked), no
anti-bot fingerprint hardening, and no CAPTCHA solving. Bundling Playwright +
Chromium into the image doesn't help — it still browses *from the datacenter IP*.

So this example keeps the browser **out** of the Function. The Function runs the
`browse` CLI, which connects out over CDP to a Verified Browserbase browser that:

- uses a **residential / verified IP** — no datacenter-IP blocking
- runs in **Verified browser mode** — passes bot-detection fingerprinting
- **auto-solves CAPTCHAs / challenges** server-side

```
┌─────────────────────────┐      CDP over wss       ┌──────────────────────────┐
│  Modal Function          │  ───────────────────────▶ │  Browserbase Verified    │
│  node + `browse` CLI     │                            │  browser (residential IP,│
│  your agent loop         │ ◀──────────────────────────│  stealth, CAPTCHA solve)  │
└─────────────────────────┘      page data / refs     └──────────────────────────┘
```

## Files

- `browsecli_in_modal.py` — the annotated Modal example (literate style; the `#`
  prose renders as the gallery page). Builds the image in code from `node:20-slim`,
  installs `browse`, runs the demo in a Function, exposes a `local_entrypoint`.
- `browsecli-demo.sh` — the demo: create a Verified session
  (`--proxies --verified --solve-captchas`), open a Cloudflare-protected page over
  CDP, and assert real content (not a challenge wall).
- `Dockerfile.equiv` — local Docker mirror of the Modal image build, used to prove
  the in-sandbox behavior without a Modal token (see Testing).
- `.env.example` — the two Browserbase env vars.

## How to run

1. Install Modal and authenticate:

   ```bash
   pip install modal
   modal setup
   ```

2. Create the Browserbase Secret (the Function reads it as env vars):

   ```bash
   modal secret create browserbase \
     BROWSERBASE_API_KEY=bb_live_... \
     BROWSERBASE_PROJECT_ID=...
   ```

   Get credentials at https://www.browserbase.com/settings.

3. Run it:

   ```bash
   modal run browsecli_in_modal.py
   # → [browsecli-demo] RESULT: ✅ PASS — reached real content ... from inside the sandbox
   ```

   Visit a different site with `modal run browsecli_in_modal.py --target-url https://...`.

## CI guard (important for the gallery)

Modal runs **every** gallery example live on each push, where the `browserbase`
Secret won't exist. The Function is guarded: if `BROWSERBASE_API_KEY` is unset it
prints a clear "skipping live run (no key)" message and returns `0` instead of
failing CI. The Secret is declared `required=False` for the same reason. With a key
present, the live run is cheap — one short Verified session against `nowsecure.nl`.

## Why this is differentiated

- **Other sandbox browser stories browse from a datacenter IP** and get blocked on
  the sites that matter. This reaches them via a residential/verified IP with
  stealth + server-side CAPTCHA solving.
- **No Chromium in the image** — smaller image, faster cold starts; the heavy
  browser runs on Browserbase, the Function just runs your agent + the CLI.
- Modal's gallery has a Playwright webscraper and an Anthropic computer-use example
  but **no third-party browser-infra example** — this fills an empty slot.

## Publish path

PR this into the Modal examples gallery:
https://github.com/modal-labs/modal-examples — under `13_sandboxes/` or
`10_integrations/`. The `.py` already matches Modal's literate format, so it needs
minimal edits. Pair with the Integration Partner program: https://modal.com/partners.

## Outreach (Modal team — we're close)

We'd love to add Browserbase to the Modal examples gallery: a one-file example that
lets a Modal Function reach any protected site via a Verified Browserbase browser
(residential IP + CAPTCHA solve), filling the currently-empty browser-infra slot.
Happy to open the `modal-examples` PR and explore an Integration Partner listing at
https://modal.com/partners alongside it.
