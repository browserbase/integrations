# BrowseCLI in a Northflank service/job

Run the [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI inside a [Northflank](https://northflank.com) microVM — provisioned by a
first-class Northflank **Template (Infrastructure-as-Code)** — to reach **any**
website, even Cloudflare/Akamai/DataDome-protected ones, via a **Verified
Browserbase browser** (residential IP, no datacenter blocking, auto CAPTCHA-solve).

## What it is

Northflank gives you containers, Jobs, and microVM Sandboxes that are great at
running your **agent loop** / code-execution workload. But that workload still
browses from a **datacenter IP** — instantly blocked on the sites that matter,
with no anti-bot fingerprint hardening and no CAPTCHA solving. Bundling Playwright
+ Chromium into the image doesn't help — it still browses *from the datacenter IP*.
(Northflank's own browser example is a trivial Playwright screenshot demo.)

So this template keeps the browser **out** of the Northflank workload. The job
runs the `browse` CLI, which connects out over CDP to a Verified Browserbase
browser that:

- uses a **residential / verified IP** — no datacenter-IP blocking
- runs in **Verified browser mode** — passes bot-detection fingerprinting
- **auto-solves CAPTCHAs / challenges** server-side

```
┌────────────────────────────┐    CDP over wss     ┌──────────────────────────┐
│  Northflank microVM job      │  ─────────────────▶ │  Browserbase Verified    │
│  node + `browse` CLI         │                      │  browser (residential IP,│
│  your agent loop             │ ◀────────────────────│  stealth, CAPTCHA solve)  │
└────────────────────────────┘    page data / refs  └──────────────────────────┘
```

## Files

- `northflank-template.json` — the Northflank IaC Template (`apiVersion: v1.2`).
  A `Workflow` that creates a `Project`, a `SecretGroup` for the Browserbase
  credentials, and a `ManualJob` built from `Dockerfile` (kaniko) that runs the
  demo. Browserbase creds and the target URL are template `arguments`.
- `Dockerfile` — `node:20-slim` + `npm i -g browse` + the demo. No Chromium;
  the heavy browser runs on Browserbase. This is what Northflank builds.
- `browsecli-demo.sh` — the demo: create a Verified session
  (`--proxies --verified --solve-captchas`), open a Cloudflare-protected page over
  CDP, and assert real content (not a challenge wall).
- `.env.example` — the Browserbase API key (for the local Docker smoke test).

> **Note:** Verified browsers/sessions (residential IP + automatic CAPTCHA solving) require a Browserbase **Scale** plan — see https://www.browserbase.com/pricing and https://www.browserbase.com/verified. On lower plans, drop `--verified` (you'll get Basic stealth).

## How to run

### Option A — Northflank UI (shareable template link)

1. Open the template (via the shareable link you publish, or
   **Templates → Create template → import JSON** and paste `northflank-template.json`).
2. Fill the template **arguments**:
   - `BROWSERBASE_API_KEY` — from
     https://www.browserbase.com/settings (put these in **argument overrides** so
     they're stored encrypted, not in the committed spec).
   - `TARGET_URL` — optional; defaults to a Cloudflare-protected page.
   - `REGION` — defaults to `us-central`.
3. **Run** the template. It creates the `BrowseCLI` project, the credentials
   `SecretGroup`, and the `browsecli-demo` job, then builds the Dockerfile and runs
   the job once. Watch the job logs for:
   ```
   [browsecli-demo] RESULT: ✅ PASS — reached real content ... from inside the sandbox
   ```

### Option B — `northflank` CLI

```bash
npm install -g @northflank/cli   # or: brew install northflank
northflank login
# Create/run the template from the JSON spec:
northflank create template --file northflank-template.json
# then run it from the UI, or via:
northflank get templates
northflank run template --template browsecli-verified-browser
```

(See https://northflank.com/docs/v1/application/infrastructure-as-code for the
template + CLI reference. The job points at this repo by default; swap `REPO_URL`/
`DOCKERFILE_PATH` args to point at your own fork.)

### Local smoke test (Docker-equivalent of the Northflank build)

Northflank builds the same `Dockerfile`, so you can prove the in-sandbox behavior
locally with no Northflank account:

```bash
docker build -t browsecli-sandbox:northflank -f Dockerfile .
docker run --rm \
  -e BROWSERBASE_API_KEY=$BROWSERBASE_API_KEY \
  browsecli-sandbox:northflank /app/browsecli-demo.sh
# → [browsecli-demo] RESULT: ✅ PASS — reached real content ... from inside the sandbox
```

## Why this is differentiated

- **Northflank markets itself as a "sandbox for AI agents"**, but its only browser
  content is a trivial Playwright screenshot demo that browses from a **datacenter
  IP** — exactly what gets blocked. This adds the **verified / anti-bot / CAPTCHA**
  browser layer that complements their code-execution microVMs.
- **No Chromium in the image** — smaller build, faster job start; the heavy browser
  runs on Browserbase while the Northflank job just runs your agent + the CLI.
- **First-class Template** — it's a real Northflank IaC `Workflow`, so it installs
  as a shareable-link template or a curated **Stack**, not a one-off snippet.

## Publish path

1. **Shareable-link Template (self-serve, no gate).** Publish
   `northflank-template.json` as a shareable template link: anyone with a Northflank
   account can add it and run it in one click. This is the immediate, ungated path.
2. **Curated Stacks gallery (BD-gated).** Pitch it for the curated gallery at
   https://northflank.com/stacks. The Stacks gallery is partner-curated, so this is
   a BD conversation with the Northflank team rather than a self-serve PR.

## Outreach (Northflank team)

Northflank is "the sandbox for AI agents," but the only browser story is a
datacenter-IP Playwright screenshot — the sites agents actually need are blocked.
We'd love to ship a Browserbase **Stack**: a one-click template that lets a
Northflank microVM reach any protected site via a Verified browser (residential IP
+ CAPTCHA solve), complementing your code-execution sandboxes. Happy to publish the
shareable-link template today and explore a curated Stacks listing —
e.g. a customer running agent workloads on Northflank that needs to browse
bot-protected sites without getting blocked.
