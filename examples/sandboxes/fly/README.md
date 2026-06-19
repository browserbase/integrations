# BrowseCLI in a Fly Machine

Run the [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI inside a [Fly Machine](https://fly.io/docs/machines/) (or a
[Fly Sprite](https://sprites.dev)) to reach **any** website — even
Cloudflare/Akamai/DataDome-protected ones — via a **Verified Browserbase browser**
(residential IP, no datacenter blocking, auto CAPTCHA-solve).

## What it is

Fly is great at running your **agent loop** in a fast Firecracker microVM, but
that VM can't browse the real web reliably: it has a **datacenter IP** (instantly
blocked), no anti-bot fingerprint hardening, and no CAPTCHA solving. Bundling
Playwright + Chromium into the image doesn't help — it still browses *from the
datacenter IP*.

So this example keeps the browser **out** of the Machine. The Machine runs the
`browse` CLI, which connects out over CDP to a Verified Browserbase browser that:

- uses a **residential / verified IP** — no datacenter-IP blocking
- runs in **Verified browser mode** — passes bot-detection fingerprinting
- **auto-solves CAPTCHAs / challenges** server-side

```
┌─────────────────────────┐      CDP over wss       ┌──────────────────────────┐
│  Fly Machine / Sprite    │  ───────────────────────▶ │  Browserbase Verified    │
│  node + `browse` CLI     │                            │  browser (residential IP,│
│  your agent loop         │ ◀──────────────────────────│  stealth, CAPTCHA solve)  │
└─────────────────────────┘      page data / refs     └──────────────────────────┘
```

## Files

- `Dockerfile` — the Fly Machine image: `node:20-slim` + `npm i -g browse`. No
  Chrome. Fly auto-detects and builds it on `fly deploy`.
- `fly.toml` — the deployable Fly App skeleton (app name, region, `[build]`,
  `[env]`, a one-shot `demo` process, modest `[[vm]]`).
- `browsecli-demo.sh` — the demo: create a Verified session
  (`--proxies --verified --solve-captchas`), open a Cloudflare-protected page over
  CDP, and assert real content (not a challenge wall).
- `.env.example` — the Browserbase API key (for the local Docker smoke test).

> **Note:** Verified browsers/sessions (residential IP + automatic CAPTCHA solving) require a Browserbase **Scale** plan — see https://www.browserbase.com/pricing and https://www.browserbase.com/verified. On lower plans, drop `--verified` (you'll get Basic stealth).

## How to run (Fly Machine)

1. Install flyctl and sign in:

   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. Create the app (edit the `app` name in `fly.toml` to something unique first, or
   let `fly launch` pick one):

   ```bash
   fly launch --no-deploy
   ```

3. Set the Browserbase credentials as Fly secrets (encrypted, injected as env):

   ```bash
   fly secrets set BROWSERBASE_API_KEY=bb_live_...
   ```

   Get credentials at https://www.browserbase.com/settings.

4. Either deploy the app, or run it as a true one-shot:

   ```bash
   # (a) Deploy the app skeleton from fly.toml — builds the Dockerfile remotely.
   fly deploy

   # (b) True run-once-and-exit: a Machine that destroys itself on exit.
   #     --rm forces restart policy to `no`, so a clean exit isn't re-run.
   fly machine run . /app/browsecli-demo.sh --rm \
     -e BROWSERBASE_API_KEY=bb_live_... \
     -e TARGET_URL=https://nowsecure.nl
   ```

   You'll see `[browsecli-demo] RESULT: ✅ PASS — reached real content ...` in the
   Machine logs (`fly logs`). Visit a different site by changing `TARGET_URL`.

> One-shot note: Fly Apps assume long-lived Machines, so `fly.toml` has no native
> "run once and exit" key — a deployed app would re-run the demo under the default
> restart policy. For batch/one-shot, prefer `fly machine run ... --rm` (path b);
> use the `fly.toml` app skeleton when you want a managed, redeployable app.

## How to run (Fly Sprite)

[Sprites](https://sprites.dev) are Fly's **persistent, stateful** agent sandboxes
(checkpoint/restore, scale-to-zero billing) — note they are deliberately *not*
ephemeral. They have their own CLI (separate from `flyctl`, no `fly.toml`):

```bash
curl -fsSL https://sprites.dev/install.sh | sh
sprite org auth
sprite create browse-demo && sprite use browse-demo
sprite exec -- bash -lc 'npm i -g browse@latest'
sprite exec -- env BROWSERBASE_API_KEY=bb_live_... \
  bash -s < browsecli-demo.sh
```

Node 22 is pre-installed in the default Sprite box, so `browse` runs immediately.

## Testing it locally (the Docker-equivalent of a Fly Machine)

A Fly Machine runs the OCI image this Dockerfile produces, so a plain `docker run`
of the same image reproduces the exact in-sandbox behavior without a Fly account:

```bash
docker build -t browsecli-sandbox:fly -f Dockerfile .
docker run --rm \
  -e BROWSERBASE_API_KEY=$BROWSERBASE_API_KEY \
  browsecli-sandbox:fly /app/browsecli-demo.sh
# → [browsecli-demo] RESULT: ✅ PASS — reached real content ... from inside the sandbox
```

See `TEST_EVIDENCE.md` for the captured live run.

## Why this is differentiated

- **Other sandbox browser stories browse from a datacenter IP** and get blocked on
  the sites that matter. This reaches them via a residential/verified IP with
  stealth + server-side CAPTCHA solving.
- **No Chromium in the image** — smaller image, faster boots; the heavy browser
  runs on Browserbase, the Machine just runs your agent + the CLI.
- **Fly's Jan-2026 Sprites push positions them as the persistent computer for AI
  agents, but Fly has no first-class browser-infra story.** This is an uncontested
  lane: the missing "how does my agent actually browse the protected web?" piece.

## Publish path

A clonable example under the [fly-apps](https://github.com/fly-apps) pattern
(`Dockerfile` + `fly.toml` + `README`, deployable with `fly launch` → `fly deploy`),
announced in a Community [Show & Tell](https://community.fly.io/c/show-tell/20)
post, and pitched as a Fly customer story (precedent: Steel.dev already has a Fly
customer story).

## Outreach (Fly team)

We'd love to add a Browserbase example to the fly-apps pattern: a clonable
`Dockerfile + fly.toml` that lets a Fly Machine (or Sprite) reach any protected
site via a Verified Browserbase browser — residential IP + server-side CAPTCHA
solving — filling the browser-infra gap in Fly's agent-sandbox story. Happy to post
it to Show & Tell and explore a customer story like Steel.dev's.
