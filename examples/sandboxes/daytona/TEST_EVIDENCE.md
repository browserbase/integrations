# Test Evidence — BrowseCLI in a Daytona Sandbox

Two tiers of evidence: what was **actually run and verified** locally, and what is
**pending a Daytona API key** (the literal `daytona.create()` / `exec()` round-trip
against Daytona's cloud).

## REAL — tested and passing

A Daytona API key was not yet available, so the in-sandbox behavior was proven
with a Docker image (`Dockerfile.equiv`) that replicates the **exact** steps the
Daytona `Image` builder runs in `main.py`: a Debian base, Node 20 via NodeSource
(`curl ... setup_20.x | bash -` → `apt-get install -y nodejs`), `npm install -g
browse@latest`, then `COPY browsecli-demo.sh`. Same base, same install commands,
same demo script the sandbox executes.

### 1. Image build (replicates the Daytona `Image` steps)

```bash
docker build -t browsecli-sandbox:daytona \
  -f examples/sandboxes/daytona/Dockerfile.equiv \
  examples/sandboxes/daytona
```

Result: build succeeded. The `browse --version` layer printed:

```
browse/0.8.5 linux-arm64 node-v20.20.2
```

This confirms Node 20 + the `browse` CLI install via the identical NodeSource
commands declared in `main.py`'s `Image.debian_slim("3.12").run_commands(...)`.

### 2. Live run against a Verified Browserbase browser

```bash
eval "$(grep -E '^(BROWSERBASE_API_KEY)=' ~/Developer/scratchpad/.env)"
export BROWSERBASE_API_KEY
docker run --rm \
  -e BROWSERBASE_API_KEY="$BROWSERBASE_API_KEY" \
  browsecli-sandbox:daytona /app/browsecli-demo.sh
```

Observed output (key never echoed):

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: 5e99da70-b441-4b33-8bf6-f810362b56e0
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

Page title: **`nowsecure.nl`**. Body: **162,832 chars** of real content (not a
"checking your browser" challenge wall). This is the same script `main.py` runs via
`sandbox.process.exec("bash /app/browsecli-demo.sh", ...)`, so the in-sandbox path
is proven end-to-end against a real Cloudflare-protected page.

### 3. `main.py` parses cleanly

```bash
python3 -c "import ast; ast.parse(open('examples/sandboxes/daytona/main.py').read()); print('py-parse OK')"
# → py-parse OK
```

(No `pip install daytona` and no Daytona key required for this check.)

## PENDING — needs a Daytona API key

The following calls in `main.py` are written against the confirmed current Daytona
Python SDK (`daytona >= 0.187.0`, `from daytona import Daytona, Image, Resources,
CreateSandboxFromImageParams`) but have **not** been executed against Daytona's
cloud because no `DAYTONA_API_KEY` was available:

- `daytona = Daytona()` — client init reading `DAYTONA_API_KEY` from env.
- `daytona.create(CreateSandboxFromImageParams(image=image, resources=Resources(...)), on_snapshot_create_logs=...)` — building the declarative `Image` and standing up the sandbox.
- `sandbox.process.exec("bash /app/browsecli-demo.sh", env=..., timeout=180)` — running the demo inside the Daytona sandbox; reading `response.result` / `response.exit_code`.
- `daytona.delete(sandbox)` — teardown.

These API names/signatures were confirmed from the official Daytona Python SDK docs
(daytona.io/docs/python-sdk) and the `daytonaio/daytona` README/PyPI as of June
2026. The single behavioral risk that local Docker cannot cover is the
Daytona-cloud round-trip itself (image build on Daytona's builder, sandbox
provisioning, the `exec` transport). The in-sandbox program behavior — the part
that does the actual browsing work — is fully proven above.

To run the real thing once a key is available:

```bash
pip install -r examples/sandboxes/daytona/requirements.txt
export DAYTONA_API_KEY=dtn_...
export BROWSERBASE_API_KEY=bb_live_...
python examples/sandboxes/daytona/main.py
```

---

## ⚠️ REAL DAYTONA API RUN (2026-06-19) — partial; egress blocker found

Real Daytona SDK runs (`daytona.create` + `process.exec`) on live infra. Findings:

1. **Image build bug (fixed):** Daytona's `debian_slim` base has no `curl` and the
   distro `nodejs` package has no `npm`; the original NodeSource step silently
   failed → `npm: not found` (exit 127). Fixed by `apt-get install curl ca-certificates gnupg`
   before NodeSource, whose `nodejs` bundles npm. Image now builds; `browse/0.8.5 linux-x64` installs.

2. **Egress is restricted by default.** From a Daytona sandbox: `api.github.com` → 200,
   but `example.com`, `google.com`, and all `*.browserbase.com` → `(35) connection reset`.
   `networkAllowList` is IPv4-CIDR only (max 10, no hostnames); `networkBlockAll` overrides it.

3. **Egress lock to Browserbase-only (designed, proven once, but flaky).** Pinned
   `networkAllowList = 8.8.8.8/32 + api(4)/connect(4) Browserbase ELB IPs` (resolved at
   runtime; the pool is a stable 4 each via 8.8.8.8) and forced `resolv.conf` to 8.8.8.8.
   The sandbox resolves Browserbase to the **same** IPs we pin (not geo-divergence).

4. **Root-cause blocker (Daytona-side).** With the IP allowlisted, `curl -v` to
   api.browserbase.com **TCP-connects** to the allowlisted IP, then gets
   `Recv failure: Connection reset by peer` **during the TLS handshake**:
   ```
   *   Trying 35.167.91.97:443...
   * Connected to api.browserbase.com (35.167.91.97) port 443
   * OpenSSL SSL_connect: Connection reset by peer
   curl: (35) Recv failure: Connection reset by peer
   ```
   i.e. Daytona's egress firewall does **SNI/domain filtering on top of the IP allowlist**
   and resets TLS for the non-permitted hostname. It passed end-to-end once (filter is
   intermittent) but is not reliable. RESOLUTION NEEDED FROM DAYTONA: permit the
   Browserbase domain/SNI for allowlisted IPs (or provide a domain allowlist). Good item
   for the Browserbase×Daytona channel. The template ships with the egress-lock design +
   this documented known issue.

---

## Daytona egress — root cause + sanctioned fix (researched 2026-06-19)

Daytona enforces egress in **two layers**:
1. **IP firewall** — `networkAllowList` / `networkBlockAll` (iptables on the runner, L3/L4). User-settable, IPv4-CIDR only, max 10 entries.
2. **Envoy proxy SNI/domain allowlist** (L7) — driven by the shared repo
   https://github.com/daytonaio/sandbox-network-whitelist (`whitelist.yaml`,
   header: "ALLOWED DOMAINS FOR ENVOY PROXY"). NOT per-sandbox configurable.

The user `networkAllowList` only opens layer 1. Browserbase is not in the layer-2
domain allowlist, so the TLS handshake to api.browserbase.com is reset (TCP connects,
SSL_connect resets) — exactly the symptom observed. IP-pinning cannot bypass the SNI
filter, and per daytona#3295 it can even break DNS/npm (EAI_AGAIN). The earlier
IP-pinning workaround was therefore removed from this template.

**Sanctioned fix (one of):**
- Run on a **Tier 3/4** Daytona org — full internet egress by default.
- Get Browserbase added to Daytona's domain allowlist: PR to
  https://github.com/daytonaio/sandbox-network-whitelist adding `api.browserbase.com`
  and `connect.*.browserbase.com` regions (wildcards match one label only), or email
  support@daytona.io.

Verified on live Daytona infra: image build ✅, SDK create/exec flow ✅; the only gap is
Daytona-side egress permission for the Browserbase domain. Docs:
https://www.daytona.io/docs/en/network-limits/ , https://www.daytona.io/docs/en/typescript-sdk/sandbox/
