# BrowseCLI Sandbox (Browserbase) — Cloudflare Container template

<!-- dash-content-start -->

Run the **BrowseCLI inside a Cloudflare Container** (Sandbox SDK), triggered by a
Worker, to reach **any** site through a **Verified Browserbase browser**:
residential IP (no datacenter-IP blocking), Verified browser mode (passes
bot-detection fingerprinting), and **auto CAPTCHA-solving** server-side.

```
HTTP request ─▶ Worker ─▶ Cloudflare Container ──CDP/wss──▶ Browserbase Verified browser
                          (node + `browse` CLI)            (residential IP, stealth, CAPTCHA solve)
```

## Why a Container (not a plain Worker)?

`browse` is a **Node CLI** — it needs a real process, a filesystem, and outbound
CDP sockets. A Worker isolate has none of those. So the Worker delegates to a
Cloudflare **Container** (a Durable-Object-backed sandbox via
[`@cloudflare/sandbox`](https://github.com/cloudflare/sandbox-sdk)) built from
[`Dockerfile`](./Dockerfile), and drives the CLI inside it with `sandbox.exec()`.

## Why Browserbase (not Cloudflare Browser Run)?

The container does **not** run a browser. Chrome lives on Browserbase and is
reached over CDP. That is the whole point and the differentiator:

| | Cloudflare Browser Run | This template (Browserbase) |
| --- | --- | --- |
| Browser location | Cloudflare edge (datacenter IP) | Browserbase (residential / verified IP) |
| Anti-bot fingerprint hardening | no | **yes (Verified mode)** |
| Server-side CAPTCHA solving | no | **yes** |
| Reaches sites that block datacenter IPs | typically blocked | **reaches real content** |

Cloudflare already ships an official
[Stagehand/Browserbase tutorial](https://developers.cloudflare.com/browser-rendering/),
so the Browserbase integration is known-good — this template leads with the
**anti-bot / CAPTCHA / verified-session** capabilities Browser Run does not offer.

<!-- dash-content-end -->

## Files

| File | Purpose |
| --- | --- |
| [`wrangler.jsonc`](./wrangler.jsonc) | Worker + Container + Durable Object binding + migration |
| [`Dockerfile`](./Dockerfile) | Container image: `cloudflare/sandbox:0.12.1` base + `npm i -g browse` + the demo |
| [`src/index.ts`](./src/index.ts) | Worker: on request, runs the demo in the container and returns the result |
| [`browsecli-demo.sh`](./browsecli-demo.sh) | The demo: Verified session → open a protected page over CDP → assert real content |
| [`package.json`](./package.json) | Deps + scripts + the `cloudflare` metadata object (templates marketplace) |
| `.dev.vars.example` / `.env.example` | Browserbase credentials placeholders |

## Run it

### 1. Install + set credentials

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID
```

Get credentials at <https://www.browserbase.com/settings>.

### 2. Local dev (`wrangler dev`)

```bash
npx wrangler dev
# in another shell:
curl http://localhost:8787/
# → ... [browsecli-demo] RESULT: ✅ PASS — reached real content ...
# override the target:
curl -X POST http://localhost:8787/ -d '{"targetUrl":"https://www.g2.com"}'
```

> `wrangler dev` builds the container image locally, so you need Docker running.

### 3. Deploy (`wrangler deploy`)

```bash
npx wrangler secret put BROWSERBASE_API_KEY
npx wrangler secret put BROWSERBASE_PROJECT_ID
npx wrangler deploy            # builds + pushes the image, provisions the Container
curl https://<your-worker>.workers.dev/
```

## Verify the container locally (no Cloudflare account needed)

The container is what actually runs the BrowseCLI. You can prove that part end to
end with Docker, using the same install + demo layer as the real image (see
[`../Dockerfile.test`](../Dockerfile.test) and
[`../TEST_EVIDENCE.md`](../TEST_EVIDENCE.md)):

```bash
docker build -t browsecli-sandbox:cloudflare-test -f ../Dockerfile.test ..
docker run --rm \
  -e BROWSERBASE_API_KEY=$BROWSERBASE_API_KEY \
  -e BROWSERBASE_PROJECT_ID=$BROWSERBASE_PROJECT_ID \
  browsecli-sandbox:cloudflare-test /app/browsecli-demo.sh
# → [browsecli-demo] RESULT: ✅ PASS — reached real content ...
```

## Publishing this template

Two paths:

1. **`cloudflare/templates`** — <https://github.com/cloudflare/templates>. PR
   (against `main`) a directory named with a **`-template`** suffix (this dir
   already is `browsecli-sandbox-template/`), a `package.json` whose `name`
   matches the dir and that carries the **`cloudflare` metadata object**
   (`label`, `products`, `categories` from the `starter | storage | ai` enum,
   `bindings`, `preview_image_url`, `preview_icon_url`). CI validates the
   metadata + preview assets and runs **Playwright E2E tests** (expected under a
   `playwright-tests/` directory), so the template must actually deploy and
   respond. Wrap the dashboard-shown README section in
   `<!-- dash-content-start -->` / `<!-- dash-content-end -->` (already done
   above). See the repo's `CONTRIBUTING.md`; the Cloudflare team supplies the
   16:9 preview image + SVG icon.
2. **Sandbox SDK examples** — <https://github.com/cloudflare/sandbox-sdk> under
   `examples/`. Lighter bar; good first home before the marketplace PR.

## Outreach (note: a long shot)

Cloudflare Browser Run competes with Browserbase, so a templates-marketplace PR
may not be accepted — lead with what Browser Run can't do (residential IPs,
verified anti-bot mode, CAPTCHA solving). Two angles: (1) open the
`cloudflare/templates` PR above and let the diff speak; (2) go through Cloudflare
**Technology Partners → Developer Services**
(<https://www.cloudflare.com/partners/technology-partners/>) to list Browserbase
as a complementary capability rather than a competitor.
