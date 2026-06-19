# BrowseCLI in a CodeSandbox SDK microVM

Run the [`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli)
CLI inside a [CodeSandbox SDK](https://codesandbox.io/docs/sdk) microVM (Firecracker,
owned by Together AI) to reach **any** website — even Cloudflare / Akamai /
DataDome-protected ones — via a **Verified Browserbase browser** (residential IP,
no datacenter blocking, auto CAPTCHA-solve).

## What it is

CodeSandbox SDK gives you fast Firecracker microVMs that are great at running your
**agent loop**. But a vanilla microVM can't browse the real web reliably: it has a
**datacenter IP** (instantly blocked), no anti-bot fingerprint hardening, and no
CAPTCHA solving. CodeSandbox's own `headless-chromium` template runs Chromium
*inside the VM* — which still browses from that datacenter IP and gets blocked on
the sites that matter.

So this template keeps the browser **out** of the microVM. The VM runs the `browse`
CLI, which connects out over CDP to a Verified Browserbase browser that:

- uses a **residential / verified IP** — no datacenter-IP blocking
- runs in **Verified browser mode** — passes bot-detection fingerprinting
- **auto-solves CAPTCHAs / challenges** server-side

```
┌──────────────────────────┐      CDP over wss       ┌──────────────────────────┐
│  CodeSandbox microVM      │  ───────────────────────▶ │  Browserbase Verified    │
│  node + `browse` CLI      │                            │  browser (residential IP,│
│  your agent loop          │ ◀──────────────────────────│  stealth, CAPTCHA solve)  │
└──────────────────────────┘      page data / refs     └──────────────────────────┘
```

## Files

```
codesandbox/
├── tpl/                          # the golden-image template (PR-ready, mirrors headless-chromium layout)
│   ├── .codesandbox/
│   │   ├── tasks.json            # setupTasks: ensure browse; task: run the demo
│   │   └── template.json         # marketplace metadata
│   ├── .devcontainer/
│   │   ├── Dockerfile            # node:20-slim + npm i -g browse  (NO browser)
│   │   └── devcontainer.json
│   ├── browsecli-demo.sh         # the demo: Verified session → protected page → assert real content
│   └── README.md
├── create.mjs                    # @codesandbox/sdk driver: create from template id + run the demo
├── package.json                  # @codesandbox/sdk dependency + build:template / start scripts
├── Dockerfile.equiv              # local Docker mirror of the golden image (for keyless testing)
├── .env.example
└── TEST_EVIDENCE.md
```

## How to build the template (golden image)

CodeSandbox builds a reusable memory snapshot from a template directory. The CLI
binary is `csb` (shipped by `@codesandbox/sdk`):

```bash
npm install
export CSB_API_KEY=csb_...                 # https://codesandbox.io/t/api
npx @codesandbox/sdk build ./tpl --name browsecli-sandbox
# → prints a TEMPLATE_ID and a ready-to-paste:  sdk.sandboxes.create({ id: "<id>" })
```

> **Note:** Verified browsers/sessions (residential IP + automatic CAPTCHA solving) require a Browserbase **Scale** plan — see https://www.browserbase.com/pricing and https://www.browserbase.com/verified. On lower plans, drop `--verified` (you'll get Basic stealth).

## How to run it via the SDK

```bash
export CSB_API_KEY=csb_...
export BROWSERBASE_API_KEY=bb_live_...      # https://www.browserbase.com/settings
TEMPLATE_ID=<id from build> npm start
# → ... RESULT: ✅ PASS — reached real content through the protected site from inside the sandbox
```

`create.mjs` does exactly what the SDK docs prescribe:

```js
import { CodeSandbox } from '@codesandbox/sdk';
const sdk = new CodeSandbox(process.env.CSB_API_KEY);
const sandbox = await sdk.sandboxes.create({ id: TEMPLATE_ID });   // fork the template
const client = await sandbox.connect();
const out = await client.commands.run('./browsecli-demo.sh', {     // run + capture stdout
  env: { BROWSERBASE_API_KEY, TARGET_URL },
});
await sdk.sandboxes.shutdown(sandbox.id);
```

Without `CSB_API_KEY` the driver no-ops with a clear message and exits `0` (CI-safe).
Override the site with `TARGET_URL=https://...`.

## Publish path

PR the `tpl/` directory into the official template repo, where the
`headless-chromium` template lives:
**https://github.com/codesandbox/sandbox-templates**

`tpl/` already mirrors that repo's convention (`.codesandbox/{tasks.json,template.json}`
+ `.devcontainer/{Dockerfile,devcontainer.json}` + `README.md`); add a matching entry
to the repo-root `templates.json` registry in the PR.

> Distribution note: CodeSandbox has no public SDK *template gallery* (templates are
> referenced by id), so reach is thin via the repo alone, and CodeSandbox's roadmap
> signals possible future browser competition. Frame this as (1) a clean technical
> example PR and (2) a direct Together AI / CodeSandbox relationship for any
> co-marketing — not a self-serve distribution play.

## Why this is differentiated vs `headless-chromium`

- **Their `headless-chromium` runs Chrome inside the VM** → datacenter IP → blocked
  on the sites that matter. **This reaches them** via a residential/verified IP with
  stealth + server-side CAPTCHA solving.
- **No browser in the image** — smaller golden image, faster microVM boot; the heavy
  browser runs on Browserbase, the VM just runs your agent + the CLI.
- One template fills the gap their in-VM browser template leaves open: real-web,
  anti-bot-resistant browsing from a sandbox.

## Outreach (CodeSandbox / Together AI)

We built a CodeSandbox SDK template that lets a microVM reach any bot-protected site
via a Verified Browserbase browser (residential IP + CAPTCHA solve) — the
complement to your `headless-chromium` template, which browses from the VM's
datacenter IP and gets blocked. Happy to PR it into `sandbox-templates` and explore
co-marketing through the Together AI relationship.
