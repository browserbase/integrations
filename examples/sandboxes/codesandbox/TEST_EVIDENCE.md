# Test Evidence — BrowseCLI in a CodeSandbox SDK microVM

Provider: **CodeSandbox SDK** (`@codesandbox/sdk`, Firecracker microVMs, owned by
Together AI). No CodeSandbox API key (`CSB_API_KEY`) was available, so the in-VM
behavior is proven with a Docker image that **replicates the golden image's
load-bearing layers**. The literal `csb build` + `sdk.sandboxes.create` calls are
listed separately as pending-key. The SDK API used in `create.mjs` was verified
against the real published package `@codesandbox/sdk@2.4.2` (type defs + a live
import smoke).

## Image / step equivalence

The golden image is defined by:

```
tpl/.devcontainer/Dockerfile:   FROM node:20-slim → npm install -g browse@latest
tpl/.codesandbox/tasks.json:    setupTasks: ensure browse → browse --version
                                tasks.browse-demo.command: ./browsecli-demo.sh
```

`Dockerfile.equiv` mirrors those exact load-bearing steps: `FROM node:20-slim` →
`npm install -g browse@latest && browse --version` → `COPY tpl/browsecli-demo.sh`.
The task command (`./browsecli-demo.sh`) is the same script the container's `CMD`
runs and the same script `create.mjs` uploads + runs — so container behavior ==
microVM task behavior.

## SDK-API equivalence (verified against @codesandbox/sdk@2.4.2)

`create.mjs` uses, and these were confirmed from the package's own type defs:

| Call in create.mjs | Verified signature (from `@codesandbox/sdk@2.4.2` `.d.ts`) |
| --- | --- |
| `new CodeSandbox(process.env.CSB_API_KEY)` | `constructor(apiToken?: string, opts?: ClientOpts)` |
| `sdk.sandboxes.create({ id })` | `create(opts?: CreateSandboxOpts & ...): Promise<Sandbox>` — `id?: string` = "what template to fork from" |
| `await sandbox.connect()` | `connect(...): Promise<SandboxClient>` |
| `client.commands.run(cmd, { env })` | `run(command, opts?: ShellRunOpts): Promise<string>`; `ShellRunOpts.env?: Record<string,string>` |
| `client.fs.writeTextFile(path, str)` | `writeTextFile(path: string, content: string, opts?): Promise<void>` |
| `sdk.sandboxes.shutdown(sandbox.id)` | `shutdown(sandboxId: string): Promise<void>` (lifecycle is on `Sandboxes`, **not** on the `Sandbox` handle) |

CLI build command confirmed from the bundled bin: `csb build <directory>` —
"Build an efficient memory snapshot from a directory ... used to create sandboxes
quickly"; supports `--name`, `--from-sandbox`, `--ports`, `--vm-tier`, `--alias`,
`--ci`. (`--skip-files` / `--ipType` do **not** exist on `build` — not used.)

## REAL-tested (run on this machine)

| Check | Command | Result |
| --- | --- | --- |
| JSON valid: tasks.json | `node -e "JSON.parse(fs.readFileSync('tpl/.codesandbox/tasks.json'))"` | `OK` |
| JSON valid: template.json | same, on `tpl/.codesandbox/template.json` | `OK` |
| JSON valid: devcontainer.json | same, on `tpl/.devcontainer/devcontainer.json` | `OK` |
| JSON valid: package.json | same, on `package.json` | `OK` |
| create.mjs syntax | `node --check create.mjs` | `syntax OK` |
| create.mjs no-key guard | `npm i @codesandbox/sdk dotenv` (temp), unset `CSB_API_KEY`, `node create.mjs` | printed `skipping live run (no CSB_API_KEY)`, **exit 0** (CI-safe; also proves it imports against real `@codesandbox/sdk@2.4.2`) |
| image build | `docker build -t browsecli-sandbox:codesandbox -f Dockerfile.equiv .` | built OK (`naming to docker.io/library/browsecli-sandbox:codesandbox done`) |
| live in-VM run | `docker run --rm -e BROWSERBASE_API_KEY=*** -e BROWSERBASE_PROJECT_ID=*** browsecli-sandbox:codesandbox /app/browsecli-demo.sh` | **✅ PASS** (see below) |

### Live run output (key redacted, never echoed)

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: 98d305fc-d952-471e-a25e-97e4405b98d0
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
- **Body length:** 162,832 chars (a challenge wall returns < 50 chars → confirms a
  real, solved page, not a "checking your browser" interstitial)
- **What it proves:** A `node:20-slim` + `browse` image, identical to the
  CodeSandbox golden image's load-bearing layers, creates a Verified Browserbase
  session and reaches real content through a bot-protected site from inside an OCI
  sandbox. (Reproduced across two runs; earlier run session id
  `42dfcc00-cab6-4545-a13e-5fad04bb949c`, also PASS.)

## PENDING-KEY (needs a CodeSandbox account/token, `CSB_API_KEY`)

| Check | Command | Why pending |
| --- | --- | --- |
| literal golden-image build | `npx @codesandbox/sdk build ./tpl --name browsecli-sandbox` | needs `CSB_API_KEY`. Image steps verified via `Dockerfile.equiv`; CLI subcommand + flags verified from the bundled bin. |
| literal SDK create + run | `TEMPLATE_ID=<id> node create.mjs` (`sdk.sandboxes.create({ id })` → `connect()` → `commands.run(..., { env })`) | needs `CSB_API_KEY`. Every method/signature verified against `@codesandbox/sdk@2.4.2` type defs; the script imports and runs its guard branch cleanly against the real package. |

## Confidence

High for in-VM behavior and CI safety: the Docker image is step-identical to the
golden image's load-bearing layers, the same `browsecli-demo.sh` the SDK invokes
passed against a live Cloudflare-protected site (twice), and the no-key guard
returns 0. The SDK driver's every call was checked against the real
`@codesandbox/sdk@2.4.2` type definitions and the file imports cleanly against the
installed package. The only unproven piece is CodeSandbox's own orchestration
(`csb build` snapshot + microVM dispatch), which is standard CodeSandbox SDK and
pending an API key.
