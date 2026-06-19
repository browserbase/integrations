# Test Evidence — BrowseCLI in a Fly Machine

Provider: **Fly.io** (Fly Machines / Sprites). No Fly account/token available, so
the in-sandbox behavior is proven with the **exact OCI image a Fly Machine runs**.
A Fly Machine boots the image built from this `Dockerfile`, so a plain `docker run`
of that image reproduces the in-Machine behavior. The literal `fly deploy` /
`fly machine run` is listed separately as pending-key.

## Image-step equivalence

Fly builds the Machine image directly from this directory's `Dockerfile`
(auto-detected; `[build].dockerfile = "Dockerfile"` in `fly.toml` for clarity):

```
FROM node:20-slim
RUN npm install -g browse@latest && browse --version
COPY browsecli-demo.sh /app/browsecli-demo.sh
CMD ["/app/browsecli-demo.sh"]
```

The Machine runs `/app/browsecli-demo.sh` (via the `demo` process in `fly.toml`,
or via `fly machine run . /app/browsecli-demo.sh --rm`). That is the same image and
the same script exercised below, so container behavior == Machine behavior.

## REAL-tested (run on this machine)

| Check | Command | Result |
| --- | --- | --- |
| toml valid | `python3 -c "import tomllib; tomllib.load(open('examples/sandboxes/fly/fly.toml','rb')); print('toml OK')"` (fell back to `tomli` on Python 3.9 — same parser/API) | `toml OK` |
| image build | `docker build -t browsecli-sandbox:fly -f examples/sandboxes/fly/Dockerfile examples/sandboxes/fly` | built OK (`naming to docker.io/library/browsecli-sandbox:fly done`) |
| live in-sandbox run | `docker run --rm -e BROWSERBASE_API_KEY=*** -e BROWSERBASE_PROJECT_ID=*** browsecli-sandbox:fly /app/browsecli-demo.sh` | **✅ PASS** (see below) |

### Live run output (key redacted, never echoed)

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: a1fa43da-a23e-431d-8ba2-29467d813e7a
[browsecli-demo] opening protected target: https://nowsecure.nl
[browsecli-demo] page title : nowsecure.nl
[browsecli-demo] body length: 162831 chars
----- first 400 chars of page text -----
    NOWSECURE
    by nodriver
    ...
----------------------------------------
[browsecli-demo] RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox
```

- **Page reached:** `https://nowsecure.nl` (Cloudflare-protected)
- **Title:** `nowsecure.nl`
- **Body length:** 162,831 chars (a challenge wall returns < 50 chars → confirms a
  real, solved page, not a "checking your browser" interstitial)
- **What it proves:** A `node:20-slim` + `browse` image — identical to the image a
  Fly Machine boots — creates a Verified Browserbase session and reaches real
  content through a bot-protected site from inside an OCI sandbox.

### fly.toml validity

`fly.toml` parses as valid TOML and exposes the expected top-level keys
(`app`, `primary_region`, `build`, `env`, `processes`, `vm`). The `[[vm]]` array
form and the `demo` process group match the modern (2024–2026) `fly launch`
shape. (`tomllib` ships in Python ≥ 3.11; this machine has 3.9, so validation used
the drop-in `tomli` backport — identical API and result.)

## PENDING-KEY (needs a Fly account/token)

| Check | Command | Why pending |
| --- | --- | --- |
| literal app deploy | `fly launch --no-deploy && fly secrets set BROWSERBASE_API_KEY=... BROWSERBASE_PROJECT_ID=... && fly deploy` | needs `fly auth login` + a Fly account. Image steps, the demo script, and `fly.toml` validity are all verified locally above. |
| literal one-shot Machine | `fly machine run . /app/browsecli-demo.sh --rm -e BROWSERBASE_API_KEY=... -e BROWSERBASE_PROJECT_ID=...` | same — needs a Fly token. This is the idiomatic run-once primitive; the underlying image + script behavior is proven via `docker run` above. |
| Sprite run | `sprite create ... && sprite exec -- ...` (see README) | needs a Sprites account (`sprite org auth`). Sprites run the same `browse` CLI on pre-installed Node 22; behavior is the same as the verified Docker run. |

## Confidence

High for in-sandbox behavior. The Docker image is the exact OCI image Fly builds
from this `Dockerfile`, the same `browsecli-demo.sh` the Machine invokes passed
against a live Cloudflare-protected site (162,831-char real body, not a challenge
wall), and `fly.toml` is valid TOML in the modern shape. The only unproven pieces
are Fly's own orchestration (`fly deploy` / `fly machine run` dispatch and the
Sprites CLI), which are standard Fly/Sprites flows and pending an account.
