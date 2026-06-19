# BrowseCLI in a Daytona Sandbox

Reach any website — even Cloudflare / Akamai / DataDome-protected ones — from a
[Daytona](https://www.daytona.io) Sandbox, using a **Verified Browserbase browser**
(residential IP, no datacenter blocking, automatic CAPTCHA solving).

## What it is

Daytona is great at running your **agent loop** in a fast, secure sandbox. But a
sandbox can't browse the real web reliably:

- Daytona's in-sandbox Chromium (shipped in its desktop snapshot) is immature, and
  full browser support is still on the roadmap.
- Even with a bundled Chromium, the sandbox has a **datacenter IP** that
  Cloudflare / Akamai / DataDome block on sight.
- There's no anti-bot fingerprint hardening and no way to solve a CAPTCHA.

So this example keeps the browser **out** of the sandbox. The Daytona Sandbox runs
the [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI, which connects out over CDP to a **Verified Browserbase browser** that:

- uses a **residential / verified IP** — no datacenter-IP blocking
- runs in **Verified browser mode** — passes bot-detection fingerprinting
- **auto-solves CAPTCHAs / challenges** server-side

```
┌──────────────────────────┐      CDP over wss       ┌──────────────────────────┐
│  Daytona Sandbox          │  ───────────────────────▶ │  Browserbase Verified    │
│  node + `browse` CLI      │                            │  browser (residential IP,│
│  your agent loop          │ ◀──────────────────────────│  stealth, CAPTCHA solve)  │
└──────────────────────────┘      page data / refs     └──────────────────────────┘
```

This mirrors the [OpenAI × Daytona computer-use cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/computer_use_with_daytona/computer_use_with_daytona)
pattern — but instead of driving the sandbox's local desktop browser, it uses
Browserbase as the hardened anti-bot / CAPTCHA browser layer Daytona doesn't
provide.

## Files

- `main.py` — builds the sandbox image declaratively with Daytona's `Image`
  builder, creates a Sandbox, uploads + runs the demo, and tears down.
- `browsecli-demo.sh` — the demo every sandbox template runs: create a Verified
  Browserbase session (`--proxies --verified --solve-captchas`), open a
  Cloudflare-protected page over CDP, and assert we reached real content instead
  of a challenge wall.
- `requirements.txt` — `daytona` Python SDK.
- `.env.example` — the three environment variables you need.
- `Dockerfile.equiv` — the Docker-equivalent of the Daytona `Image`, for running
  the in-sandbox behavior locally (see [TEST_EVIDENCE.md](./TEST_EVIDENCE.md)).

> **Note:** Verified browsers/sessions (residential IP + automatic CAPTCHA solving) require a Browserbase **Scale** plan — see https://www.browserbase.com/pricing and https://www.browserbase.com/verified. On lower plans, drop `--verified` (you'll get Basic stealth).

## How to run

```bash
pip install -r requirements.txt

export DAYTONA_API_KEY=dtn_...            # https://app.daytona.io/dashboard/keys
export BROWSERBASE_API_KEY=bb_live_...    # https://www.browserbase.com/settings

python main.py
```

Expected tail:

```
[browsecli-demo] page title : nowsecure.nl
[browsecli-demo] RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox
[browsecli-in-daytona] exit code: 0
```

Override the target site with `export TARGET_URL=https://...`.

## How it works (Daytona SDK)

```python
from daytona import Daytona, Image, Resources, CreateSandboxFromImageParams

daytona = Daytona()  # reads DAYTONA_API_KEY from env

# Declarative image: Node 20 + the browse CLI. No Chrome — it lives on Browserbase.
image = (
    Image.debian_slim("3.12")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        "npm install -g browse@latest",
    )
    .add_local_file("browsecli-demo.sh", "/app/browsecli-demo.sh")
)

# Build + create the sandbox directly from the Image (no pre-made snapshot needed).
sandbox = daytona.create(CreateSandboxFromImageParams(image=image, resources=Resources(cpu=1, memory=2)))

# Run the demo, injecting Browserbase creds per-exec (kept out of the image).
resp = sandbox.process.exec("bash /app/browsecli-demo.sh", env={"BROWSERBASE_API_KEY": "..."})
print(resp.result)

daytona.delete(sandbox)
```

To reuse the image across runs, create a named snapshot once with
`daytona.snapshot.create(CreateSnapshotParams(name=..., image=image, resources=...), on_logs=print)`
and then create from `CreateSandboxFromSnapshotParams(snapshot="...")`.

## Differentiation

Daytona ships compute; Browserbase ships a **browser that the open web actually
lets in**. A vanilla sandbox browsing from its own IP gets blocked, fingerprinted,
and CAPTCHA-walled. Browserbase's Verified browser gives the Daytona agent a
residential-IP, stealth-hardened, auto-CAPTCHA-solving browser over CDP — the
hardened browsing layer Daytona's roadmap browser doesn't yet cover.

## Publish path

- Open a PR adding this under [`daytonaio/daytona/examples`](https://github.com/daytonaio/daytona/tree/main/examples).
- Or ship a paid tutorial via [`daytonaio/content`](https://github.com/daytonaio/content).

## Outreach (Daytona channel)

We have an active channel with Daytona — lead with it. Pitch this as an
`examples/` PR (zero-friction, shows the integration working end-to-end), then
propose it for the **Daytona AI Partner Network** as the recommended anti-bot /
CAPTCHA browsing layer, and offer a deeper walkthrough through the **content
program** (paid tutorial) mirroring their OpenAI computer-use cookbook.
