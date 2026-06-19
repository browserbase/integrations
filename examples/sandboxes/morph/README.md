# BrowseCLI on Morph Cloud

Run the [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI **inside a Morph Cloud instance** to reach any site through a **Verified
Browserbase browser** — residential IP, no datacenter-IP blocking, server-side
CAPTCHA solving.

The browser never runs inside the Morph instance. The instance runs your agent
loop + the `browse` CLI, and connects **out** over CDP to a Browserbase Verified
browser that:

- uses a **residential / verified IP** — no datacenter-IP blocking
- runs in **Verified browser mode** — passes bot-detection fingerprinting
- **auto-solves CAPTCHAs / challenges** server-side

```
┌─────────────────────────┐        CDP over wss        ┌──────────────────────────┐
│  Morph Cloud instance    │ ─────────────────────────▶ │  Browserbase Verified     │
│  node + `browse` CLI     │                            │  browser (residential IP, │
│  your agent loop         │ ◀───────────────────────── │  stealth, CAPTCHA solve)   │
└─────────────────────────┘        page data / refs     └──────────────────────────┘
```

## How it works

[`main.py`](./main.py) uses the `morphcloud` SDK to:

1. Create a base snapshot (`client.snapshots.create(image_id="morphvm-minimal", ...)`).
2. Bake Node + `browse` into the snapshot with `snapshot.setup(...)` steps —
   Morph snapshots serve as cached **templates**, so re-runs reuse the prebuilt
   image instead of reinstalling.
3. Boot an instance (`client.instances.start(...)`, `instance.wait_until_ready()`).
4. Upload and run [`browsecli-demo.sh`](./browsecli-demo.sh) via `instance.exec(...)`,
   which creates a Verified Browserbase session (`--proxies --verified
   --solve-captchas`), opens a Cloudflare-protected page over CDP, and asserts it
   reached real content instead of a challenge wall.

## Run it

```bash
cp .env.example .env   # fill in your keys
pip install -r requirements.txt

export MORPH_API_KEY=...           # https://cloud.morph.so
export BROWSERBASE_API_KEY=...     # https://www.browserbase.com/settings
export BROWSERBASE_PROJECT_ID=...

python main.py
# → [browsecli-demo] RESULT: ✅ PASS — reached real content ... from inside the sandbox
```

Override the target with `TARGET_URL=https://...`.

### Verify without a Morph key (Docker-equivalent)

The Morph snapshot's software state is reproduced in
[`Dockerfile.equiv`](./Dockerfile.equiv) (`node:20-slim` + `npm i -g browse`),
so you can prove the in-instance behavior with only Browserbase keys:

```bash
docker build -t browsecli-sandbox:morph -f Dockerfile.equiv .
docker run --rm \
  -e BROWSERBASE_API_KEY="$BROWSERBASE_API_KEY" \
  -e BROWSERBASE_PROJECT_ID="$BROWSERBASE_PROJECT_ID" \
  browsecli-sandbox:morph /app/browsecli-demo.sh
```

## Differentiation (read this if you're from Morph)

Morph ships a **native cloud-Chromium "Browsers" product** and a `browser-use`
example. This example is **not** a replacement for that — it's complementary:

- Morph's native browser is a great in-VM Chromium for general automation.
- The `browse` CLI here is specifically the **verified / anti-bot /
  CAPTCHA-solving** browser, accessed **from** a Morph instance over CDP. It's
  the tool you reach for when a target is behind Cloudflare / DataDome / a
  datacenter-IP block, or fires CAPTCHAs that need server-side solving.

In short: keep Morph for the microVM + agent loop; call Browserbase when the
**target site actively fights bots** and you need a residential, verified,
CAPTCHA-solving browser.

## Publish path

This example targets Morph's public examples repo:
[morph-labs/morphcloud-examples-public](https://github.com/morph-labs/morphcloud-examples-public)
(no CONTRIBUTING guide — open a PR). It mirrors that repo's per-example layout
(`main.py` + `requirements.txt` + `README.md`).

> Priority note: this is the **lowest-priority** sandbox template — Morph is a
> partial competitor (native cloud Chromium + browser-use example), so a
> "BrowseCLI on Morph" example competes head-on. Frame it strictly as
> "BrowseCLI = verified / anti-bot / CAPTCHA-solving browser called **from** a
> Morph sandbox," and prefer self-hosting this example over pushing it upstream.

## Outreach (deprioritized — direct competitor)

> Hey Morph team — quick complement to your native Browsers product: an example
> showing how to call a **Verified Browserbase browser from a Morph instance**
> when a target is behind Cloudflare/DataDome or fires CAPTCHAs (residential IP +
> server-side solve), so Morph users have an escape hatch for the hardest
> anti-bot sites. Drop-in `main.py` + README that mirror your examples format —
> happy to PR if useful.
