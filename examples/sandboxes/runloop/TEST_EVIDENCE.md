# Test Evidence — Runloop BrowseCLI template

Provider: **Runloop** (runloop.ai). Tested on 2026-06-18, arm64 macOS via Docker.

The Runloop blueprint image is a Dockerfile, so it is testable end-to-end with
Docker — which is the exact image a real Runloop devbox boots from. The only part
that needs a live `RUNLOOP_API_KEY` is the devbox provisioning + exec lifecycle;
the browser-reaching behavior inside the image (the load-bearing part) is fully
proven below.

## REAL-tested (Docker-equivalent of the devbox)

| Command / flow | Observed output | Confidence / sufficiency |
| --- | --- | --- |
| `docker build -t browsecli-sandbox:runloop -f examples/sandboxes/runloop/blueprint.Dockerfile examples/sandboxes/runloop` | Build succeeded; `browse/0.8.5 linux-arm64 node-v20.20.2` printed; demo script copied + chmod'd | Proves the Blueprint image builds and bakes in `node` + `browse` CLI exactly as a Runloop devbox would. |
| `docker run --rm -e BROWSERBASE_API_KEY=*** browsecli-sandbox:runloop /app/browsecli-demo.sh` | `session ready: c9abe7d5-…` → `page title : nowsecure.nl` → `body length: 162831 chars` → `RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox` | Proves the load-bearing path: a Verified Browserbase session (`--proxies --verified --solve-captchas`) reaches a Cloudflare-protected page over CDP and returns real content, not a challenge wall. This is identical to what the devbox runs via `execute_sync`. |
| `python3 -c "import ast; ast.parse(open('examples/sandboxes/runloop/main.py').read()); print('py-parse OK')"` | `py-parse OK` | Proves `main.py` is syntactically valid Python. |

### Raw output of the live container run

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: c9abe7d5-abd5-4a4c-aed0-8d481335cfcd
[browsecli-demo] opening protected target: https://nowsecure.nl
[browsecli-demo] page title : nowsecure.nl
[browsecli-demo] body length: 162831 chars
[browsecli-demo] RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox
```

## PENDING-KEY (needs a live RUNLOOP_API_KEY)

These exercise the literal Runloop SDK lifecycle. Not run here because no Runloop
key is available in this environment. The SDK method names/params used in
`main.py` and `index.ts` were verified against the official Runloop SDK references
(`runloopai/api-client-python` `api.md` + param TypedDicts, and
`runloopai/api-client-ts`).

| Command / flow | What it would prove | Why not run |
| --- | --- | --- |
| `python main.py create-blueprint` / `npm run create-blueprint` | `client.blueprints.create_and_await_build_complete(name, dockerfile, file_mounts)` builds the Blueprint on Runloop | No `RUNLOOP_API_KEY`. |
| `python main.py run` / `npm run run-demo` | `devboxes.create_and_await_running(blueprint_name, environment_variables)` → `devboxes.execute_sync(id, command="bash /app/browsecli-demo.sh")` → `result.stdout/.exit_status` → `devboxes.shutdown(id)` | No `RUNLOOP_API_KEY`. The exec'd command is byte-identical to the Docker-tested run above, so the in-devbox behavior is already proven. |

## API correctness notes

- Python: `Runloop(bearer_token=…)`, `blueprints.create_and_await_build_complete(name=, dockerfile=, file_mounts=)`, `devboxes.create_and_await_running(blueprint_name=, environment_variables=, name=)`, `devboxes.execute_sync(id, command=)`, `devboxes.shutdown(id)`. Result fields `stdout`, `stderr`, `exit_status` per `DevboxExecutionDetailView`.
- TypeScript: `new Runloop({ bearerToken })`, `blueprints.createAndAwaitBuildComplete(...)`, `devboxes.createAndAwaitRunning(...)`, `devboxes.executeSync(id, { command })`, `devboxes.shutdown(id)`. Generated client uses snake_case body/response fields (`environment_variables`, `blueprint_name`, `exit_status`).
