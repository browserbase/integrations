# BrowseCLI in a sandbox — quickstart

Run a **browser agent inside any code sandbox** without getting blocked.

A sandbox (E2B, Modal, Vercel, Daytona, Cloudflare, Fly, …) is great at running your
agent loop, but a vanilla microVM has a **datacenter IP**, no anti-bot hardening, and
no CAPTCHA solving — so it gets blocked the moment it touches the real web. Bundling
Playwright + Chromium doesn't help: it still browses *from the datacenter IP*.

The fix: keep the browser **out** of the sandbox. The sandbox runs the
[`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli) CLI, which
connects out over CDP to a **Verified Browserbase browser** — residential IP, stealth
fingerprint, server-side CAPTCHA solving.

```
   Your sandbox (any provider)              CDP over wss            Browserbase
   ┌────────────────────────────┐  ────────────────────────────▶  ┌────────────────────────┐
   │  node + `browse` CLI        │                                  │  Verified browser       │
   │  your agent loop            │  ◀────────────────────────────  │  residential IP·stealth │
   │  NO Chrome in the sandbox   │        page data / refs          │  auto CAPTCHA solve     │
   └────────────────────────────┘                                  └────────────────────────┘
```

---

## Prerequisites (60 seconds)

1. A Browserbase account → grab your **API key + Project ID** from the
   [dashboard](https://www.browserbase.com/overview) (free plan works).
2. Export them anywhere the sandbox can read them:

```bash
export BROWSERBASE_API_KEY=bb_live_xxx
export BROWSERBASE_PROJECT_ID=xxxxxxxx-xxxx-xxxx
```

That's the only credential the browser needs — everything below reuses it.

---

## Part 1 — Just the CLI (no sandbox, ~30s)

Prove the core path on your laptop first. The browser still runs on Browserbase.

```bash
npm install -g browse

# create a Verified session (residential IP + stealth + CAPTCHA solving)
SESSION=$(browse cloud sessions create --proxies --verified --solve-captchas --keep-alive --timeout 300)
CONNECT=$(echo "$SESSION" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).connectUrl))')

# open a Cloudflare-protected page through it
browse open https://nowsecure.nl --cdp "$CONNECT" --session demo
browse get title --session demo     # → "nowsecure.nl"  (real content, not a challenge wall)
browse stop --session demo
```

If that returns the real page, you're ready to put it inside a sandbox.

> The same logic, packaged for piping into any sandbox, lives in
> [`_shared/browsecli-demo.sh`](./_shared/browsecli-demo.sh) — every template below runs it.

---

## Part 2 — Pick your sandbox

Each folder is a drop-in template in that provider's native format. **Tested** = run
end-to-end on the provider's real cloud; **Verified (container)** = run inside the exact
OCI image that provider's sandbox executes.

| Sandbox | Folder | Run it | Status |
| --- | --- | --- | --- |
| **E2B** | [`e2b/`](./e2b) | `npm i && e2b template create … && npm start` | ✅ Tested (real API) |
| **Modal** | [`modal/`](./modal) | `modal run browsecli_in_modal.py` | ✅ Tested (real API) |
| **Vercel Sandbox** | [`vercel-sandbox/`](./vercel-sandbox) | `pnpm i && npx tsx sandbox.ts` | ✅ Tested (real API) |
| **Daytona** | [`daytona/`](./daytona) | `pip install daytona && python main.py` | ⚠️ Needs egress (see note) |
| **Cloudflare** | [`cloudflare/`](./cloudflare) | `npm i && wrangler deploy` | ✅ Verified (container) |
| **Fly.io** | [`fly/`](./fly) | `fly launch && fly deploy` | ✅ Verified (container) |
| **Northflank** | [`northflank/`](./northflank) | run the template (UI / API) | ✅ Verified (container) |
| **CodeSandbox SDK** | [`codesandbox/`](./codesandbox) | `npx @codesandbox/sdk build ./tpl && node create.mjs` | ✅ Verified (container) |
| **Runloop** | [`runloop/`](./runloop) | `python main.py` | ✅ Verified (container) |
| **Blaxel** | [`blaxel/`](./blaxel) | `bl deploy` | ✅ Verified (container) |
| **Morph** | [`morph/`](./morph) | `python main.py` | ✅ Verified (container) |

Every template ends with: `✅ PASS — reached real content through the protected site from inside the sandbox`.

---

## Per-sandbox quickstart

> All of these assume `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` are exported,
> plus the provider's own key. See each folder's `README.md` for the full walkthrough
> and `TEST_EVIDENCE.md` for exactly how it was verified.

### E2B
```bash
cd e2b && npm i
export E2B_API_KEY=e2b_xxx
e2b template create browsecli-sandbox -d e2b.Dockerfile -c "tail -f /dev/null" --ready-cmd "browse --version"
npm start            # Sandbox.create → uploads demo → runs it
```

### Modal
```bash
cd modal && pip install modal
modal run browsecli_in_modal.py     # reads BROWSERBASE_API_KEY from your env
```

### Vercel Sandbox
```bash
cd vercel-sandbox && pnpm i
export VERCEL_TOKEN=… VERCEL_TEAM_ID=… VERCEL_PROJECT_ID=…   # team must have Sandbox enabled
npx tsx sandbox.ts
```

### Daytona
```bash
cd daytona && pip install daytona      # Python 3.10+
export DAYTONA_API_KEY=dtn_xxx
python main.py
```
> ⚠️ **Daytona egress prerequisite** — Daytona restricts sandbox egress by default and
> Browserbase isn't on its domain allowlist yet, so the browse call is blocked on Tier 1/2.
> Until [daytonaio/sandbox-network-whitelist#117](https://github.com/daytonaio/sandbox-network-whitelist/pull/117)
> merges + deploys, run on a **Tier 3/4 org** (full egress by default). Details:
> [`daytona/README.md`](./daytona).

### Cloudflare (Sandbox SDK / Containers)
```bash
cd cloudflare/browsecli-sandbox-template && npm i
# put BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID in .dev.vars (or `wrangler secret put`)
wrangler deploy        # Worker triggers a container that runs `browse`
```

### Fly.io
```bash
cd fly
fly launch --no-deploy
fly secrets set BROWSERBASE_API_KEY=… BROWSERBASE_PROJECT_ID=…
fly machine run . /app/browsecli-demo.sh --rm    # one-shot
```

### Northflank
Publish the IaC template ([`northflank-template.json`](./northflank)) as a shareable
template, or run it via the dashboard/API with the two Browserbase secrets set.

### CodeSandbox SDK
```bash
cd codesandbox && npm i
export CSB_API_KEY=csb_xxx
npx @codesandbox/sdk build ./tpl     # build the golden image
node create.mjs                       # boot a VM from it and run the demo
```

### Runloop
```bash
cd runloop && pip install runloop-api-client
export RUNLOOP_API_KEY=…
python main.py        # builds a Blueprint devbox, runs the demo
```

### Blaxel
```bash
cd blaxel && bl deploy        # builds the hub/browsecli template image and runs it
```

### Morph
```bash
cd morph && pip install morphcloud
export MORPH_API_KEY=…
python main.py
```

---

## How the demo proves it works

Every template runs [`_shared/browsecli-demo.sh`](./_shared/browsecli-demo.sh), which:

1. creates a Verified Browserbase session (`--proxies --verified --solve-captchas`),
2. opens a Cloudflare-protected page (`nowsecure.nl`) over CDP from inside the sandbox,
3. asserts the response is real content, not a challenge wall, and prints **PASS / FAIL**.

Want the local proof (the exact container any OCI sandbox runs)?
```bash
cd _shared
docker build -t browsecli-sandbox:shared .
docker run --rm -e BROWSERBASE_API_KEY -e BROWSERBASE_PROJECT_ID browsecli-sandbox:shared
```

---

## Troubleshooting

- **`401 Unauthorized`** — check `BROWSERBASE_API_KEY`; confirm with `browse cloud projects list`.
- **`Connection error` / TLS reset on Daytona** — egress is blocked; see the Daytona note above.
- **Provider sandbox restricts egress** — the sandbox only needs outbound to
  `*.browserbase.com` + `connect.<region>.browserbase.com`. Allow those; the browser
  (and all the sites it visits) runs on Browserbase, so nothing else needs opening.
- **Anything else** — `browse doctor --json`, then each folder's `TEST_EVIDENCE.md`.
