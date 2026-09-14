---
name: herdr-browse
description: Use herdr-browse for browser navigation, website interaction, screenshots, form filling, and web-app testing inside a Herdr workspace. Prefer it over browse or direct browser automation so Herdr can isolate each agent session and preserve workspace login state.
compatibility: 'Requires herdr-browse inside a Herdr workspace. Cloud browsing requires BROWSERBASE_API_KEY.'
license: MIT
allowed-tools: Bash
---

# Herdr Browse

Use `herdr-browse` as the browser automation CLI inside a Herdr workspace. It delegates browser operations to the Browse CLI while assigning the current workspace and agent's session automatically.

Do not call `browse` directly and do not pass `--session`. Doing either bypasses Herdr's session isolation and workspace context handling.

## Browser routing

Open the target URL first:

```bash
herdr-browse open <url>
```

Herdr uses a local browser for localhost, loopback addresses, and `.localhost`, `.local`, or `.test` hosts. Other URLs use Browserbase and the workspace's persistent context. Override this only when the task requires it:

```bash
herdr-browse open <url> --local
herdr-browse open <url> --cloud
```

Cloud browsing requires `BROWSERBASE_API_KEY`. The workspace context preserves cookies and local storage across cloud sessions. Each agent gets a separate live session.

## Interaction workflow

Inspect the page before acting, then take a new snapshot after navigation or a UI update because element refs can change:

```bash
herdr-browse snapshot
herdr-browse click @0-5
herdr-browse fill @0-8 "search query"
herdr-browse snapshot
```

Useful delegated Browse commands include:

```bash
herdr-browse get url
herdr-browse get title
herdr-browse get text body
herdr-browse screenshot --path page.png
herdr-browse tab list
herdr-browse wait load
herdr-browse doctor --json
```

Run `herdr-browse <topic> --help` before using unfamiliar Browse commands.

## Lifecycle

Check or stop only the current agent's session:

```bash
herdr-browse status
herdr-browse stop
```

`herdr-browse reset` deletes the entire workspace's remote context and saved login state. Run it only when the user asks to remove that state or resetting it is necessary to complete the task. Use `--yes` only when that destructive action is already authorized.

## Browse.sh skills

Site-specific Browse.sh skill discovery remains available through the wrapper:

```bash
herdr-browse skills find <domain-or-task>
herdr-browse skills add <domain>/<task>
```

Use `herdr-browse skills install` to install or refresh this Herdr-specific skill. Do not run `browse skills install`, which installs instructions for the unwrapped `browse` command.
