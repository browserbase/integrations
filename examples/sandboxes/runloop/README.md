# BrowseCLI on Runloop — reach any site from a devbox via a Verified Browserbase browser

Run the [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI **inside a Runloop devbox** to reach any website through a **Verified
Browserbase browser** — residential IP, no datacenter blocking, anti-bot stealth,
and automatic CAPTCHA solving.

## What this is

A Runloop devbox is great at running your **agent loop** — but a vanilla
Firecracker devbox can't browse the real web reliably. It has a **datacenter IP**
(instantly blocked by Cloudflare / Akamai / DataDome), no anti-bot fingerprint
hardening, and no way to solve a CAPTCHA. The usual fix — bundling Playwright +
Chromium into the devbox image — still browses *from the datacenter IP*, so the
hard sites stay blocked.

So we keep the browser **out** of the devbox. The devbox runs the `browse` CLI,
which connects out over CDP to a **Verified Browserbase browser** that:

- uses a **residential / verified IP** — no datacenter-IP blocking
- runs in **Verified browser mode** — passes bot-detection fingerprinting
- **auto-solves CAPTCHAs / challenges** server-side

```
┌─────────────────────────┐      CDP over wss       ┌──────────────────────────┐
│  Runloop devbox          │  ───────────────────────▶ │  Browserbase Verified    │
│  node + `browse` CLI     │                            │  browser (residential IP,│
│  your agent loop         │ ◀──────────────────────────│  stealth, CAPTCHA solve)  │
└─────────────────────────┘      page data / refs     └──────────────────────────┘
```

## Files

| File | Purpose |
| --- | --- |
| `blueprint.Dockerfile` | The Runloop **Blueprint** — a Docker-layer-cached devbox image baking in `node` + `npm i -g browse` (plus `python3`). No Chrome. |
| `main.py` | Python runner: `create-blueprint`, then `run` (create devbox → exec the demo → shut down). |
| `index.ts` | TypeScript runner: same two commands via `@runloop/api-client`. |
| `browsecli-demo.sh` | The load-bearing demo: create a Verified session, open a Cloudflare-protected page over CDP, assert real content (not a challenge wall). |
| `package.json` / `requirements.txt` | TS / Python deps. |
| `.env.example` | `RUNLOOP_API_KEY`, `BROWSERBASE_API_KEY`. |

> **Note:** Verified browsers/sessions (residential IP + automatic CAPTCHA solving) require a Browserbase **Scale** plan — see https://www.browserbase.com/pricing and https://www.browserbase.com/verified. On lower plans, drop `--verified` (you'll get Basic stealth).

## How to run

Get a Runloop key at [platform.runloop.ai](https://platform.runloop.ai) and
Browserbase keys at [browserbase.com](https://www.browserbase.com).

```bash
cp .env.example .env   # fill in both keys, then export them
export RUNLOOP_API_KEY=...  BROWSERBASE_API_KEY=...
```

### Python

```bash
pip install -r requirements.txt
python main.py create-blueprint          # build the reusable devbox image (once)
python main.py run                        # create a devbox + run the demo
python main.py run --target-url https://www.g2.com   # any protected site
```

### TypeScript

```bash
npm install
npm run create-blueprint                  # build the reusable devbox image (once)
npm run run-demo                          # create a devbox + run the demo
npm run start -- run --target-url https://www.g2.com
```

Expected tail:

```
[browsecli-demo] RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox
```

## Why Browserbase (vs. a browser running in the devbox)

| | Browser inside the devbox | **BrowseCLI → Verified Browserbase** |
| --- | --- | --- |
| IP reputation | Datacenter IP — instantly blocked | **Residential / verified IP** |
| Bot fingerprint | Default headless, easily flagged | **Verified browser mode** |
| CAPTCHAs | You build a solver | **Auto-solved server-side** |
| Devbox image | Heavy (Chromium + deps) | Lean (just node + `browse`) |

The devbox stays lean and focused on your agent logic; the hard browser problem
(IP, stealth, CAPTCHA) is handled by Browserbase.

## Publish path

This mirrors Runloop's own
[`browser-integrations/`](https://github.com/runloopai/runloop-examples/tree/main/browser-integrations)
directory, whose stated purpose is to drive third-party cloud browser providers
from Runloop devboxes. Today it contains only `kernel/`. This template is the
drop-in **`browserbase/`** equivalent, meant to be PR'd as:

> https://github.com/runloopai/runloop-examples/tree/main/browser-integrations/browserbase

## Outreach (to Runloop)

> Your `browser-integrations/` directory explicitly invites third-party cloud
> browser providers, and right now it only ships Kernel. We'd like to PR a
> `browserbase/` example mirroring the same Blueprint + Python/TS shape — it
> reaches anti-bot-protected sites from a devbox via a Verified browser
> (residential IP + auto CAPTCHA-solve), the one thing a devbox-local browser
> can't do. Happy to co-market the integration.
