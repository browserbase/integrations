# Test Evidence — BrowseCLI on Morph Cloud

Provider: **Morph / Morph Cloud** (cloud.morph.so — snapshot-based instant-boot microVMs).

There is no Morph API key in this environment, so the Morph snapshot/instance
path is reproduced via a Docker-equivalent image (`Dockerfile.equiv`) that has
the **exact same software state** the snapshot would have (`node:20-slim` +
`npm i -g browse@latest` + the demo script). This proves the in-instance
behavior; the literal `morphcloud` API calls remain pending a Morph key.

## REAL-tested (ran here, with real Browserbase credentials)

| Check | Command | Result |
| --- | --- | --- |
| Python syntax | `python3 -c "import ast; ast.parse(open('main.py').read()); print('py-parse OK')"` | `py-parse OK` |
| Build snapshot-equiv image | `docker build -t browsecli-sandbox:morph -f examples/sandboxes/morph/Dockerfile.equiv examples/sandboxes/morph` | Built OK; `browse --version` ran during build |
| Run demo in container | `docker run --rm -e BROWSERBASE_API_KEY=*** browsecli-sandbox:morph /app/browsecli-demo.sh` | **✅ PASS — reached real content** |

### Container run output (verbatim, keys redacted)

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: df073383-d6bc-4720-8c83-1fbb3fb56654
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

- Page title: **`nowsecure.nl`**
- Body length: **162,832 chars** (a challenge wall would return an empty/short body)
- This exercises the full path: `browse` CLI in the container → Verified
  Browserbase session (`--proxies --verified --solve-captchas`) → Cloudflare-
  protected `nowsecure.nl` over CDP → real content asserted.

## PENDING-KEY (requires a real MORPH_API_KEY)

These are the literal `morphcloud` SDK calls in `main.py`, not yet run because no
Morph key is available here:

| Step | Call | Status |
| --- | --- | --- |
| Create base snapshot | `client.snapshots.create(image_id="morphvm-minimal", vcpus, memory, disk_size)` | PENDING |
| Bake Node + `browse` into snapshot | `snapshot.setup("install node 20")`, `snapshot.setup("npm i -g browse@latest")` | PENDING |
| Boot instance | `client.instances.start(snapshot_id=...)` + `instance.wait_until_ready()` | PENDING |
| Upload + run demo | `instance.exec(command=...)` (base64 upload, then run with BB env) | PENDING |
| Cleanup | `with client.instances.start(...) as instance:` context-manager stop | PENDING |

To run the literal Morph path:

```bash
export MORPH_API_KEY=...
export BROWSERBASE_API_KEY=...
pip install -r requirements.txt
python main.py
```

## Assumptions / notes

- Idiomatic SDK shape confirmed against Morph docs (start-here/first-success,
  snapshots, hello-world) and the `morph-python-sdk` README: `from
  morphcloud.api import MorphCloudClient`, `snapshots.create(...)`,
  `instances.start(...)`, `wait_until_ready()`, `instance.exec(command=...)` with
  `result.stdout` / `.stderr` / `.exit_code`, `instance.stop()` /
  context-manager cleanup.
- `snapshot.setup(...)` is used to build the template (each setup returns a new
  cached snapshot — Morph's documented snapshot-chaining model where re-runs
  reuse the prebuilt image). `result.stderr` / `result.exit_code` are accessed
  defensively (`getattr`) since the exact field names aren't fully documented.
- The container reproduces only the snapshot's **software state**, not Morph's
  Firecracker/microVM substrate — sufficient to prove the `browse`-over-CDP
  behavior, not the Morph boot/snapshot mechanics themselves.
```
