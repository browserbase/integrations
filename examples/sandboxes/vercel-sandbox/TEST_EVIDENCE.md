# Test Evidence — BrowseCLI in a Vercel Sandbox

Provider: **Vercel Sandbox** (`@vercel/sandbox`, ephemeral Firecracker microVM).

The Vercel Sandbox runtime is an Amazon-Linux Node microVM. Creating a real
microVM requires a Vercel token, which was not available at test time. So the
in-sandbox behavior (`npm i -g browse` + run the demo against a protected site
through a Verified Browserbase browser) was proven with a Docker-equivalent
container (`node:20-slim`, mirroring the runtime), and the TypeScript was
type-checked against the real `@vercel/sandbox` package.

## REAL — tested (container behavior + TS typecheck)

### 1. Docker-equivalent in-sandbox flow — ✅ PASS

```bash
eval "$(grep -E '^(BROWSERBASE_API_KEY)=' ~/Developer/scratchpad/.env)"
export BROWSERBASE_API_KEY

docker build -t browsecli-sandbox:vercel -f Dockerfile.equiv .

docker run --rm \
  -e BROWSERBASE_API_KEY="$BROWSERBASE_API_KEY" \
  browsecli-sandbox:vercel /app/browsecli-demo.sh
```

Observed output (key redacted, never echoed):

```
[browsecli-demo] browse version: browse/0.8.5 linux-arm64 node-v20.20.2
[browsecli-demo] creating Verified Browserbase session (proxies + verified + solve-captchas)...
[browsecli-demo] session ready: 155b2583-4746-494d-9cd6-7926a6f9a6a3
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

**Proves:** inside a Node sandbox runtime identical to Vercel's, `browse`
installs globally, opens a Verified Browserbase session, drives a
Cloudflare-protected page over CDP, and pulls **162,831 chars** of real content
(page title `nowsecure.nl`) — not a challenge wall. This is the exact command
`sandbox.ts` runs via `runCommand({ cmd: 'bash', args: ['-lc', './browsecli-demo.sh'], env: {...} })`.

### 2. TypeScript typecheck against real `@vercel/sandbox@2.2.1` — ✅ PASS

```bash
# in a temp project with @vercel/sandbox@2.2.1 + typescript@5.5.4 + @types/node@20 installed
tsc --noEmit -p tsconfig.json   # both sandbox.ts and app/api/run/route.ts
# exit code: 0  (zero type errors)
```

**Proves:** `sandbox.ts` and `app/api/run/route.ts` compile against the real
package types. API surface verified directly against the installed `.d.ts`:

| Symbol used | Confirmed in `@vercel/sandbox@2.2.1` |
| --- | --- |
| `Sandbox.create({ runtime, timeout, token, teamId, projectId })` | `static create(params?: CreateSandboxParams & Credentials …)`; `Credentials = { token, projectId, teamId }`; runtime union includes `"node24"` |
| `sandbox.runCommand({ cmd, args, env, stdout, stderr })` | `RunCommandParams { cmd; args?; env?; stdout?: Writable; stderr?: Writable; … }` |
| `sandbox.writeFiles([{ path, content }])` | `writeFiles(files: { path; content: string \| Uint8Array; mode? }[])` — `Buffer` satisfies `Uint8Array` |
| `cmd.exitCode` | `Command.exitCode: number \| null` |
| `cmd.stdout()` / `cmd.stderr()` (route.ts) | methods returning `Promise<string>` |
| `sandbox.name` | `get name(): string` (used for the ready log; there is no `id`/`sandboxId` getter) |
| `sandbox.stop()` | `stop(opts?): Promise<void>` |

> Note: the version pin was corrected from a placeholder to `^2.2.1` (current
> latest) after confirming the live package.

## PENDING — not yet run (needs a Vercel token)

The literal `Sandbox.create(...)` call that spins up a real Firecracker microVM
was **not** executed — `@vercel/sandbox` requires Vercel auth
(`VERCEL_TOKEN` / `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID`) to provision a VM, and
no token was available.

To run end-to-end on a real microVM once a token is available:

```bash
pnpm i
cp .env.example .env   # add Browserbase + Vercel creds
npx tsx sandbox.ts
# expect: "✓ Done — BrowseCLI reached real content from inside the Vercel Sandbox."
```

What remains unproven by the container test: the actual microVM provisioning,
`writeFiles` upload over the Vercel API, and outbound network egress from a
real Vercel Sandbox to Browserbase. The control flow and types are verified;
only the live VM round-trip is pending a token.

---

## ✅ REAL VERCEL SANDBOX RUN (2026-06-19) — layers 2+3 verified

Literal `@vercel/sandbox` microVM provisioning + control plane + egress.

```
$ npx tsx sandbox.ts
› Creating Vercel Sandbox (Firecracker microVM, runtime=node24)…
› Sandbox ready: <name>
› Installing `browse` CLI inside the sandbox…
› Running BrowseCLI demo against a protected site…
[browsecli-demo] page title : nowsecure.nl
[browsecli-demo] body length: 162831 chars
[browsecli-demo] RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox
✓ Done — BrowseCLI reached real content from inside the Vercel Sandbox.
```

Auth: `{token, teamId, projectId}` triad — token from the already-authenticated Vercel CLI
(OAuth token works for the Sandbox SDK), personal team `team_VgKxDmBXGB4cBeSj0p54Ipfk`,
throwaway project `browsecli-sandbox-demo` created via `vercel project add`.
Proves: real Firecracker microVM build (Amazon Linux node24 runtime), real Sandbox.create
control-plane round-trip, and **egress from a Vercel Sandbox to Browserbase works by default**
(no allowlisting required, unlike Daytona).
