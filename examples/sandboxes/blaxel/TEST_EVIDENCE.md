# Test Evidence — `hub/browsecli` (Blaxel)

Provider: **Blaxel** (blaxel.ai). Image mirrors the Blaxel hub format (layers
`ghcr.io/blaxel-ai/sandbox` `sandbox-api`, sandbox API on :8080) + Node 20 +
`browse` CLI. Tested as the Docker-equivalent of a Blaxel sandbox — no Blaxel
auth required for the container behavior.

Note: Blaxel's `sandbox-api` image is **linux/amd64 only**
(`docker manifest inspect ghcr.io/blaxel-ai/sandbox:latest` → `[(linux, amd64), (unknown, unknown)]`),
matching Blaxel's own `docker-compose.yaml` (`platform: linux/amd64`). All
builds/runs below pin `--platform linux/amd64`. This is the real deploy target;
on Apple Silicon it runs under emulation.

## REAL-tested (ran locally, with real Browserbase credentials)

| Command / flow | Observed output | Confidence / sufficiency |
| --- | --- | --- |
| `python3 -c "import json; json.load(open('examples/sandboxes/blaxel/template.json'))"` | `json OK` | Proves `template.json` is valid JSON with the required Blaxel hub fields (`name`, `displayName`, `categories`, `description`, `longDescription`, `url`, `icon`, `memory`, `ports`, `enterprise`, `coming_soon`). |
| `docker build --platform linux/amd64 -t browsecli-sandbox:blaxel -f examples/sandboxes/blaxel/Dockerfile examples/sandboxes/blaxel` | Build succeeded; `sandbox-api` copied from `ghcr.io/blaxel-ai/sandbox`; `browse/0.8.5 linux-x64 node-v20.20.2` printed during `browse --version`. | Proves the image builds, layers the real Blaxel sandbox-api, and the `browse` CLI installs and runs. |
| `docker run --rm --platform linux/amd64 -e BROWSERBASE_API_KEY=*** browsecli-sandbox:blaxel /app/browsecli-demo.sh` (the **exact documented** command) | `[browsecli-demo] session ready: f88d3b0d-…` → `page title : nowsecure.nl` → `body length: 162832 chars` → `RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox` | **Primary proof.** From inside the Blaxel image, the `browse` CLI created a Verified Browserbase session (`--proxies --verified --solve-captchas`) and reached the real content of a Cloudflare-protected page over CDP — not a challenge wall. End-to-end success against a live anti-bot site. |
| `docker run --rm --platform linux/amd64 -d browsecli-sandbox:blaxel` (no args) then `docker logs` | `Port: 8080` / `Starting Sandbox API server on :8080` | Proves default (no-arg) entrypoint boots the Blaxel `sandbox-api` on :8080 — i.e. the image behaves as a first-class Blaxel sandbox under `bl deploy`, while still running the demo when a command is passed. |
| `docker run … --entrypoint sh … -c 'realpath $(command -v browse)'` | `browse -> /usr/local/lib/node_modules/browse/bin/run.js`; `browse --version` → `browse/0.8.5` | Confirms `browse` resolves to the CLI (distinct from the `sandbox-api` binary, which also lives in `/usr/local/bin`). |

Test target: `https://nowsecure.nl` (Cloudflare-protected). A challenge wall
returns an empty/short body or a "checking your browser" interstitial; the demo
asserts a real body (≥50 chars and no challenge markers) — observed ~162.8k
chars of real page text.

## PENDING-KEY (requires Blaxel account/CLI auth — not run here)

| Step | Why pending |
| --- | --- |
| `bl push` | Pushes the template image to Blaxel; needs Blaxel CLI auth. The image it would push is the one built and verified above. |
| `bl deploy` | Deploys a sandbox from the image (runs `sandbox-api` on :8080, verified locally above); needs Blaxel auth. |
| `bl … exec -- /app/browsecli-demo.sh` (in a live Blaxel sandbox) | Same demo verified above, run inside Blaxel's runtime with creds set as sandbox secrets; needs Blaxel auth. |
| PR `hub/browsecli` → <https://github.com/blaxel-ai/sandbox> | Publish path per Blaxel CONTRIBUTING (fork, add `hub/browsecli/`, open PR). Out of scope for this build; owned by main session/git. |
