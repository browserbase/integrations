# Shared core — BrowseCLI in a sandbox

Every provider template under `examples/sandboxes/<provider>/` reuses this pattern.

## The idea

A code sandbox (E2B, Modal, Daytona, Vercel, Cloudflare, Fly, ...) is great at
running your **agent loop**, but a vanilla Firecracker/OCI sandbox can't browse
the real web reliably — it has a datacenter IP (instantly blocked), no
anti-bot fingerprint hardening, and no CAPTCHA solving.

So we keep the browser **out** of the sandbox. The sandbox runs the
[`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli) CLI,
which connects out over CDP to a **Verified Browserbase browser** that:

- uses a **residential / verified IP** — no datacenter-IP blocking
- runs in **Verified browser mode** — passes bot-detection fingerprinting
- **auto-solves CAPTCHAs / challenges** server-side

```
┌────────────────────────┐         CDP over wss          ┌─────────────────────────┐
│  Sandbox (any provider) │  ───────────────────────────▶ │  Browserbase Verified    │
│  node + `browse` CLI    │                                │  browser (residential IP,│
│  your agent loop        │ ◀─────────────────────────────│  stealth, CAPTCHA solve)  │
└────────────────────────┘         page data / refs       └─────────────────────────┘
```

## Files

- `Dockerfile` — canonical base: `node:20-slim` + `npm i -g browse`. No Chrome.
  This is the exact image a Docker/OCI sandbox runs.
- `browsecli-demo.sh` — the demo every template runs: create a Verified session
  (`--proxies --verified --solve-captchas`), open a Cloudflare-protected page over
  CDP, and assert we reached real content instead of a challenge wall.

## Run it locally (the Docker-equivalent of any OCI sandbox)

```bash
docker build -t browsecli-sandbox:shared .
docker run --rm \
  -e BROWSERBASE_API_KEY=$BROWSERBASE_API_KEY \
  -e BROWSERBASE_PROJECT_ID=$BROWSERBASE_PROJECT_ID \
  browsecli-sandbox:shared
# → [browsecli-demo] RESULT: ✅ PASS — reached real content ... from inside the sandbox
```

Override the target with `-e TARGET_URL=https://...`.
