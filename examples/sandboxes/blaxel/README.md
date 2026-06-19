# BrowseCLI on Blaxel — `hub/browsecli`

Run the Browserbase [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI inside a [Blaxel](https://blaxel.ai) sandbox to reach **any** site through a
**Verified Browserbase browser** — residential IP, no datacenter blocking, and
automatic CAPTCHA / challenge solving.

## What it is

A drop-in Blaxel hub template that mirrors the hub format (`Dockerfile` +
`template.json` + `entrypoint.sh`, layering the Blaxel `sandbox-api` on port
8080, exactly like `hub/chromium` and `hub/playwright-chromium`) — but it
**inverts the browser model**:

| | Blaxel `hub/chromium`, `hub/playwright-chromium` | `hub/browsecli` (this template) |
| --- | --- | --- |
| Where the browser runs | **Inside** the sandbox (headless Chromium over CDP) | **Outside** — on Browserbase |
| IP | Sandbox datacenter IP (instantly blocked by anti-bot) | **Residential / verified IP** |
| Bot-detection fingerprint | Stock headless Chromium (detectable) | **Verified browser mode** (passes fingerprinting) |
| CAPTCHAs / challenges | Not handled | **Auto-solved server-side** |
| What the sandbox ships | The browser | Node + the `browse` CLI (no browser) |

The sandbox runs your agent loop and the CLI; the CLI connects out over CDP to a
Browserbase browser. That lets a Blaxel sandbox reach anti-bot- and
CAPTCHA-walled sites the stock in-sandbox Chromium gets blocked on.

```
┌─────────────────────────────┐      CDP over wss       ┌──────────────────────────┐
│  Blaxel sandbox             │  ────────────────────▶  │  Browserbase Verified     │
│  node + `browse` CLI        │                         │  browser (residential IP, │
│  sandbox-api on :8080       │ ◀────────────────────── │  stealth, CAPTCHA solve)   │
└─────────────────────────────┘      page data / refs   └──────────────────────────┘
```

## Files

- `Dockerfile` — `node:20-slim` (glibc) + the Blaxel `sandbox-api` (port 8080) +
  `npm i -g browse`. No Chrome/Chromium.
- `template.json` — registers the template in the hub (name `browsecli`,
  categories `browser` / `scraping`, sandbox-api on 8080).
- `entrypoint.sh` — dispatcher: no args boots `sandbox-api` (normal `bl deploy`);
  any args are exec'd, so `… /app/browsecli-demo.sh` runs the demo.
- `browsecli-demo.sh` — creates a Verified Browserbase session
  (`--proxies --verified --solve-captchas`), opens a Cloudflare-protected page
  over CDP, and asserts real content instead of a challenge wall.
- `.env.example` — `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`.

## Run it locally (the Docker-equivalent of a Blaxel sandbox)

No Blaxel auth needed — this is the exact image Blaxel builds.

```bash
export BROWSERBASE_API_KEY=...   BROWSERBASE_PROJECT_ID=...

# Blaxel's sandbox-api is linux/amd64-only, so pin the platform.
docker build --platform linux/amd64 -t browsecli-sandbox:blaxel .

docker run --rm --platform linux/amd64 \
  -e BROWSERBASE_API_KEY="$BROWSERBASE_API_KEY" \
  -e BROWSERBASE_PROJECT_ID="$BROWSERBASE_PROJECT_ID" \
  browsecli-sandbox:blaxel /app/browsecli-demo.sh
# → [browsecli-demo] RESULT: ✅ PASS — reached real content ... from inside the sandbox
```

Override the target with `-e TARGET_URL=https://...`. Run with **no** trailing
command to boot the sandbox API on `:8080` instead (the `bl deploy` behavior).

## Run / publish on Blaxel

Install the Blaxel CLI (`bl`) and authenticate, then push the image and deploy a
sandbox from it:

```bash
# Build + push this template's image to Blaxel
bl push

# Deploy a sandbox that runs the sandbox-api (port 8080)
bl deploy

# Set creds as sandbox secrets/env, then run the demo inside the live sandbox
#   BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID
bl ... exec -- /app/browsecli-demo.sh
```

(Exact `bl` subcommands/flags follow the Blaxel CLI docs at
<https://docs.blaxel.ai>; the image and demo path above are what matters.)

### Publish path — PR into the Blaxel hub

Per Blaxel's CONTRIBUTING "Creating New Templates" flow, hub templates live in
`hub/<name>/` with a `Dockerfile` + `template.json`:

1. Fork <https://github.com/blaxel-ai/sandbox>.
2. Add this directory as `hub/browsecli/` (the four files above).
3. Build locally and verify per their testing step.
4. Open a PR documenting purpose and usage.

Browser-Use and Kernel slots in the hub are empty — `hub/browsecli` is a
first-mover for "verified / anti-bot / CAPTCHA-solving browsers" that the stock
in-sandbox Chromium templates can't offer.

## Why this matters (differentiation)

Blaxel's existing browser templates run Chromium **in** the sandbox over CDP.
They're great until a site fingerprints headless Chromium, blocks the datacenter
IP, or throws a CAPTCHA — then they're stuck. `hub/browsecli` routes the browser
to Browserbase's Verified fleet, so the same Blaxel sandbox can reach protected
sites end-to-end.

## Outreach (Blaxel)

> Blaxel ships a public hub of sandbox templates with an explicit "Creating New
> Templates" flow and accepts third-party stacks. We'd open a `hub/browsecli` PR
> per CONTRIBUTING — a sandbox that reaches anti-bot / CAPTCHA-walled sites via a
> Verified Browserbase browser, which their in-sandbox Chromium templates can't —
> and pair it with a Build0-style co-marketing blog ("verified browsers for
> Blaxel sandboxes"), filling the empty browser-automation slot.
