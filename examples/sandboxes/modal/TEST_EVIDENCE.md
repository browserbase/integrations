# Test Evidence — BrowseCLI in a Modal Function

Provider: **Modal** (modal.com). Modal API token not yet available, so the
in-sandbox behavior is proven with a Docker image that **replicates the exact
Modal image build steps** in `browsecli_in_modal.py`. The literal `modal run` is
listed separately as pending-key.

## Image-step equivalence

`browsecli_in_modal.py` builds:

```python
modal.Image.from_registry("node:20-slim", add_python="3.12")
    .run_commands("npm install -g browse@latest", "browse --version")
    .add_local_file("browsecli-demo.sh", "/app/browsecli-demo.sh", copy=True)
```

`Dockerfile.equiv` mirrors the load-bearing layers: `FROM node:20-slim` →
`npm install -g browse@latest && browse --version` → `COPY browsecli-demo.sh`.
(`add_python` is irrelevant to the browse demo and is the only step not mirrored.)
The Function shells out to `bash /app/browsecli-demo.sh` — the same script the
container's `CMD` runs — so container behavior == Function behavior.

## REAL-tested (run on this machine)

| Check | Command | Result |
| --- | --- | --- |
| py-parse | `python3 -c "import ast; ast.parse(open('browsecli_in_modal.py').read()); print('py-parse OK')"` | `py-parse OK` |
| image build | `docker build -t browsecli-sandbox:modal -f Dockerfile.equiv .` | built OK (`naming to docker.io/library/browsecli-sandbox:modal done`) |
| live in-sandbox run | `docker run --rm -e BROWSERBASE_API_KEY=*** browsecli-sandbox:modal /app/browsecli-demo.sh` | **✅ PASS** (see below) |
| CI guard (no key) | simulated the Function's guard branch with `BROWSERBASE_API_KEY` unset | returned `0`, printed `skipping live run (no BROWSERBASE_API_KEY)` |

### Live run output (key redacted, never echoed)

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: c3cff65d-eff4-4338-8773-5fcbc9ff2691
[browsecli-demo] opening protected target: https://nowsecure.nl
[browsecli-demo] page title : nowsecure.nl
[browsecli-demo] body length: 162832 chars
----- first 400 chars of page text -----
    NOWSECURE
    by nodriver
    ...
----------------------------------------
[browsecli-demo] RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox
```

- **Page reached:** `https://nowsecure.nl` (Cloudflare-protected)
- **Title:** `nowsecure.nl`
- **Body length:** 162,832 chars (challenge wall returns < 50 chars → confirms a
  real, solved page, not a "checking your browser" interstitial)
- **What it proves:** A `node:20-slim` + `browse` image, identical to the Modal
  image, creates a Verified Browserbase session and reaches real content through a
  bot-protected site from inside an OCI sandbox.

### CI-guard simulation output

```
[browsecli-in-modal] skipping live run (no BROWSERBASE_API_KEY). Set it with: modal secret create browserbase BROWSERBASE_API_KEY=...
guard returncode: 0
CI-GUARD OK (exit 0 when no key)
```

- **What it proves:** With no `browserbase` Secret (Modal's gallery CI), the
  Function returns `0` and skips cleanly — it will not fail CI.

## PENDING-KEY (needs a Modal account/token)

| Check | Command | Why pending |
| --- | --- | --- |
| literal Modal run | `modal run browsecli_in_modal.py` | needs `modal setup` (token) + `modal secret create browserbase ...`. Not run here; image steps + Function logic verified via the Docker equivalent and guard simulation above. |
| Modal gallery CI (no secret) | gallery push runs the example live | mirrored locally via the CI-guard simulation; the real CI run is pending an actual gallery PR. |

## Confidence

High for in-sandbox behavior and CI safety. The Docker image is byte-for-step
identical to the Modal image's load-bearing layers, the same `browsecli-demo.sh`
the Function invokes passed against a live Cloudflare-protected site, and the
no-key guard returns 0. The only unproven piece is Modal's own orchestration
(`from_registry` build + remote dispatch), which is standard Modal and pending a
token.

---

## ✅ REAL MODAL API RUN (2026-06-18) — layers 2+3 verified

Not Docker-equivalent — this is the literal Modal image builder + control plane + egress.

```
$ export BROWSERBASE_API_KEY=...
$ modal run browsecli_in_modal.py
🔨 Created function reach_protected_site.
[browsecli-demo] browse version: browse/0.8.5 linux-x64 node-v20.20.2
[browsecli-demo] session ready: 69990de9-d4e0-49b9-b08b-2847ad769e71
[browsecli-demo] page title : nowsecure.nl
[browsecli-demo] body length: 162831 chars
[browsecli-demo] RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox
[browsecli-in-modal] done
✓ App completed. https://modal.com/apps/shrey150/main/ap-Rkxf6BhlntGG7me26RsB4l
```

Bug found + fixed via the real run: `modal.Secret.from_name("browserbase", required=False)` failed
(`TypeError: from_name() got an unexpected keyword argument 'required'`) on modal client 1.2.6.
Switched to `modal.Secret.from_dict({...})` reading local env — works now AND stays CI-safe
(empty key in Modal's live-CI → guard exits 0).

Proves: real Modal image build (node:20-slim + add_python, amd64), real Function control-plane run,
and **egress from a Modal Function to Browserbase over WSS is allowed**.
