# Test Evidence — BrowseCLI in a Northflank service/job

Provider: **Northflank** (northflank.com). No Northflank account/token available
here, so the in-sandbox behavior is proven with a Docker image that builds the
**exact `Dockerfile` Northflank itself builds** (kaniko builds the same Dockerfile
this repo provides). The template JSON is separately validated as well-formed. The
literal `northflank run template` is listed as pending-key.

## Build-step equivalence

The Northflank template (`northflank-template.json`) provisions a `ManualJob` with:

```json
"buildSettings": {
  "dockerfile": {
    "buildEngine": "kaniko",
    "dockerFilePath": "${args.DOCKERFILE_PATH}",
    "dockerWorkDir": "${args.DOCKER_WORK_DIR}"
  }
}
```

i.e. Northflank's builder builds this folder's `Dockerfile` (`FROM node:20-slim` →
`npm install -g browse@latest && browse --version` → `COPY browsecli-demo.sh`) and
the container `CMD` runs `/app/browsecli-demo.sh`. The local `docker build` below
builds the identical Dockerfile, so container behavior == Northflank job behavior.
The credentials reach the job via the template's `SecretGroup` →
`runtimeEnvironment`, mirrored locally by `docker run -e`.

## REAL-tested (run on this machine)

| Check | Command | Result |
| --- | --- | --- |
| template JSON valid | `python3 -c "import json; json.load(open('examples/sandboxes/northflank/northflank-template.json')); print('json OK')"` | `json OK` |
| image build | `docker build -t browsecli-sandbox:northflank -f examples/sandboxes/northflank/Dockerfile examples/sandboxes/northflank` | built OK (`naming to docker.io/library/browsecli-sandbox:northflank done`) |
| live in-sandbox run | `docker run --rm -e BROWSERBASE_API_KEY=*** -e BROWSERBASE_PROJECT_ID=*** browsecli-sandbox:northflank /app/browsecli-demo.sh` | **✅ PASS** (see below) |

### Live run output (key redacted, never echoed)

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: 6a0c4edb-1d85-49dd-95a4-9725b2d5be1c
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
- **What it proves:** A `node:20-slim` + `browse` image, identical to the image
  Northflank builds from this `Dockerfile`, creates a Verified Browserbase session
  and reaches real content through a bot-protected site from inside an OCI sandbox.

## PENDING-KEY (needs a Northflank account/token)

| Check | Command | Why pending |
| --- | --- | --- |
| literal template run | `northflank create template --file northflank-template.json` then run it | needs `northflank login` (account/token) + filling the `BROWSERBASE_*` argument overrides. Build + job logic verified via the Docker equivalent above (Northflank kaniko-builds the same Dockerfile). |
| shareable-link publish | publish template → open shareable link → "Add + run" | needs a Northflank account to generate the shareable template link; the spec itself is validated as well-formed JSON. |

## Confidence

High for in-sandbox behavior. The Docker image is step-identical to the image
Northflank builds from this `Dockerfile`, the same `browsecli-demo.sh` the job's
`CMD` runs passed against a live Cloudflare-protected site, and the template JSON
parses cleanly and mirrors Northflank's documented IaC schema (`apiVersion v1.2`,
`Workflow` → `Project` + `SecretGroup` + `ManualJob`, `buildSettings.dockerfile`
with kaniko, `${args.*}` argument references). The only unproven piece is
Northflank's own orchestration (provisioning the project/secret-group/job and the
kaniko build of the Dockerfile), which is standard Northflank and pending a token.
