# Test evidence — Cloudflare Container template (BrowseCLI + Browserbase)

Two layers to this template:

1. **The container actually runs the BrowseCLI and reaches real content.** This
   is the load-bearing behavior and is provider-agnostic. **REAL-tested below.**
2. **The Cloudflare glue** (`wrangler deploy`, Worker → container `exec`,
   `@cloudflare/sandbox` Durable Object). Requires a Cloudflare account and pull
   access to the `cloudflare/sandbox` base image. **PENDING (config validated,
   not live-deployed) — see below.**

---

## REAL-tested (container behavior)

The Worker runs the container; the container runs the demo. The real Cloudflare
image (`browsecli-sandbox-template/Dockerfile`) derives from
`docker.io/cloudflare/sandbox:0.12.1` (linux/amd64 only), which is not pullable in
this offline sandbox (registry blocked). So the test uses `Dockerfile.test` — the
**same** `npm i -g browse` + COPY-demo layer on the canonical `node:20-slim` base.
If this layer PASSes, it PASSes identically on the cloudflare/sandbox base (both
ship a recent Node; same `browse`, same script).

### Commands

```bash
eval "$(grep -E '^(BROWSERBASE_API_KEY)=' ~/Developer/scratchpad/.env)"
export BROWSERBASE_API_KEY

docker build -t browsecli-sandbox:cloudflare-test \
  -f examples/sandboxes/cloudflare/Dockerfile.test \
  examples/sandboxes/cloudflare

docker run --rm \
  -e BROWSERBASE_API_KEY="$BROWSERBASE_API_KEY" \
  browsecli-sandbox:cloudflare-test /app/browsecli-demo.sh
```

### Observed output (real run)

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: 26199f62-3b2e-46be-a531-d56b46e786dc
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

| Item | Result |
| --- | --- |
| Build | succeeded (exit 0), image 747MB, `browse/0.8.5` baked in |
| Demo exit code | 0 |
| Page title | `nowsecure.nl` |
| Body length | 162,831 chars (real content, not a challenge wall) |
| Verdict | **✅ PASS** |

**What this proves:** a container with only Node + `npm i -g browse` (no Chrome)
reaches real content through a Cloudflare-protected page via a Verified
Browserbase session over CDP. This is exactly what `src/index.ts` triggers via
`sandbox.exec("/app/browsecli-demo.sh", { env: {...} })`.

---

## Config validation (static, real)

| Check | Command | Result |
| --- | --- | --- |
| `wrangler.jsonc` parses | strip comments → `JSON.parse` via node | **VALID** — `name`, `main`, `containers[0].class_name=Sandbox`, `durable_objects.bindings[0]={name:Sandbox,class_name:Sandbox}`, `migrations[0]={tag:v1,new_sqlite_classes:[Sandbox]}` |
| `src/index.ts` syntax | `node --check` on a types-stripped JS shim | **OK** (`WORKER_SHIM_SYNTAX_OK`) |
| Demo script copied | `diff` vs `_shared/browsecli-demo.sh` | identical |

---

## PENDING (requires a Cloudflare account / network)

Not exercised here because it needs Cloudflare auth + the cloudflare/sandbox base
image (registry blocked in this environment):

| Item | Why pending | Confidence |
| --- | --- | --- |
| `wrangler deploy` provisions Worker + Container + DO | needs Cloudflare account + `wrangler login` | High — `wrangler.jsonc` matches the documented `containers` / `durable_objects` / `migrations` shape |
| Worker → container `sandbox.exec()` returns stdout | needs the live container runtime | Medium-High — mirrors the `@cloudflare/sandbox` `getSandbox` + `exec` API; the command it runs is the same demo proven above |
| Build of `browsecli-sandbox-template/Dockerfile` (`cloudflare/sandbox:0.12.1`, linux/amd64) | base image not pullable offline | Medium — only the FROM line differs from the proven test image; the `browse` install + COPY layer is identical |
| `cloudflare/templates` Playwright E2E CI | runs only inside the marketplace repo on PR | N/A here |

### Net

The capability that makes this template worth shipping — BrowseCLI in a container
reaching anti-bot-protected real content through a Verified Browserbase browser —
is **proven with a real run**. The remaining Cloudflare-specific wiring is
config-validated and matches the documented Sandbox SDK shapes, but a live
`wrangler deploy` smoke test is still pending a Cloudflare account.
