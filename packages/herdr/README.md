# Herdr Browserbase plugin

Give every Herdr workspace its own Browserbase context. Agents in that workspace get separate live sessions and share the context's cookies and local storage.

## Install

You need Node.js 20 or newer and Herdr 0.9 or newer.

```bash
herdr plugin install browserbase/integrations/packages/herdr
```

The Herdr actions work immediately after plugin installation. Install the package command when you also want to control the browser directly from agent terminals:

```bash
npm install --global @browserbasehq/herdr
```

This installs `herdr-browse` and its private copy of `browse`. You do not need a global `browse` installation.

Install the bundled agent skill so Codex, Claude Code, and other supported agents automatically choose the workspace-aware command for browser tasks:

```bash
herdr-browse skills install
```

Start a new agent session after installation so it discovers the skill. The skill tells agents to use `herdr-browse` instead of calling the underlying `browse` command directly and not to supply their own session name.

For local development:

```bash
herdr plugin link /path/to/integrations/packages/herdr
npm --prefix /path/to/integrations/packages/herdr install
npm --prefix /path/to/integrations/packages/herdr run build
npm link /path/to/integrations/packages/herdr
```

Cloud browsing reads credentials from the environment inherited by Herdr:

```bash
export BROWSERBASE_API_KEY="bb_live_..."
export BROWSERBASE_PROJECT_ID="..."
herdr
```

The plugin never writes these values to its state file. It also disables `browse`'s legacy automatic `.env` loading, so a workspace `.env` cannot silently select a different Browserbase account.

Herdr shows the manifest and both install-time build commands before it runs them. The npm install is scoped to this package and does not install the rest of the integrations monorepo.

## Use

Run commands inside a Herdr workspace:

```bash
herdr-browse open http://localhost:3000
herdr-browse snapshot
herdr-browse click @0-3
herdr-browse screenshot page.png
herdr-browse status
herdr-browse stop
```

Localhost, loopback addresses, and `.localhost`, `.local`, or `.test` hosts use a clean local browser. Other URLs use Browserbase. Override routing when needed:

```bash
herdr-browse open https://example.com --local
herdr-browse open http://localhost:3000 --cloud
```

`herdr-browse` passes commands and arguments to the bundled `browse` CLI. It adds a session name derived from the current Herdr workspace and agent or pane, which prevents agents from controlling one another's live sessions.

## Persistence and concurrency

The first cloud open creates a Browserbase Context for the workspace. Later sessions load it, and stopping a session saves cookies and local storage back to it.

Agents have separate live browser sessions but share the workspace Context. If several sessions update it concurrently, the last released session wins.

Local browser sessions are isolated and do not keep state after they stop.

Resetting deletes the remote Context and its saved login state:

```bash
herdr-browse reset
# Non-interactive:
herdr-browse reset --yes
```

## Herdr actions

The plugin registers actions to start a blank cloud browser, inspect its status, and stop it. Use `herdr-browse open <url>` when you want automatic local or cloud routing.

## State

The plugin stores context IDs and session metadata in `HERDR_PLUGIN_STATE_DIR/browser-state.json`. It writes the file atomically under a lock. It does not store API keys, cookies, or local storage. Browserbase stores the persistent browser data in the workspace Context.

When `herdr-browse` runs directly from an agent terminal, Herdr does not inject `HERDR_PLUGIN_STATE_DIR`. The command uses Herdr's standard per-plugin state location instead:

- `$XDG_STATE_HOME/herdr/plugins/browserbase.browser` when `XDG_STATE_HOME` is set
- `$HOME/.local/state/herdr/plugins/browserbase.browser` on macOS and Linux
- `%LOCALAPPDATA%\\herdr\\plugins\\browserbase.browser` on Windows

## Marketplace publishing

Herdr discovers plugins from public GitHub repositories whose default branch contains a valid `herdr-plugin.toml` and whose repository has the `herdr-plugin` topic. After this package reaches the default branch, add that topic to `browserbase/integrations`. The marketplace refreshes automatically.
