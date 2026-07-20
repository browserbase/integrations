# Example Eve browser agent

This agent mounts the local `@browserbasehq/eve` extension as `browserbase`, so
its tools are available as `browserbase__create_session`,
`browserbase__navigate`, `browserbase__observe`, `browserbase__act`,
`browserbase__extract`, `browserbase__agent`, and
`browserbase__stop_session`. It also exposes `browserbase__search` and
`browserbase__fetch`, which do not require a browser session.

## Run it

From the sibling `eve` extension directory:

```bash
cd ../eve
nvm use
pnpm install
pnpm build
cp ../eve-example/.env.example ../eve-example/.env
```

Fill in the values in `../eve-example/.env`, then start the agent:

```bash
pnpm --filter browserbase-eve-example dev
```

Eve requires Node.js 24 or newer. Both workspace packages include an `.nvmrc`
for Node 24.16.0. If that version is not installed yet, run
`nvm install 24.16.0` before `nvm use`.

The Eve terminal UI opens. Try this prompt:

```text
Open https://news.ycombinator.com and return the titles and URLs of the first
five stories. Use a Browserbase session and stop it when you are done.
```

The environment requires:

- `BROWSERBASE_API_KEY` to create the cloud browser and power Stagehand through
  Browserbase Model Gateway.
- `AI_GATEWAY_API_KEY` to power the Eve agent model. A linked Vercel project's
  `VERCEL_OIDC_TOKEN` can be used instead.

The dependency on `@browserbasehq/eve` uses pnpm's `workspace:*` protocol, so
the example exercises the sibling extension without publishing it first. The
workspace-level install provides dependencies for both packages.
