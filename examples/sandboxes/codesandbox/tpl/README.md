# BrowseCLI → Verified Browserbase (CodeSandbox golden-image template)

A CodeSandbox SDK template that runs the
[`browse`](https://github.com/browserbase/stagehand/tree/main/packages/cli) CLI
inside a microVM and reaches **any** website — even Cloudflare / Akamai /
DataDome-protected ones — through a **Verified Browserbase browser**:
residential IP, anti-bot stealth fingerprint, server-side CAPTCHA solving.

Unlike the `headless-chromium` template, **no browser runs in the microVM**. The
VM runs your agent loop + the CLI; the browser runs on Browserbase and is reached
out over CDP. A datacenter-IP in-VM Chrome gets blocked on the sites that matter —
this doesn't.

## Layout

```
.codesandbox/
  tasks.json       # setupTasks: ensure `browse`; task: run the demo
  template.json    # marketplace metadata
.devcontainer/
  Dockerfile       # node:20-slim + npm i -g browse  (NO browser in the image)
  devcontainer.json
browsecli-demo.sh  # create a Verified session, open a protected page, assert real content
```

## Build the golden image

```bash
CSB_API_KEY=csb_... npx @codesandbox/sdk build . --name browsecli-sandbox
# prints a template id → pass it to sdk.sandboxes.create({ id })
```

## Run the demo in a created sandbox

Set `BROWSERBASE_API_KEY` as env on the command run
(see `../create.mjs`), then run the `browse-demo` task or `./browsecli-demo.sh`.
Expected tail: `RESULT: ✅ PASS — reached real content through the protected site`.
