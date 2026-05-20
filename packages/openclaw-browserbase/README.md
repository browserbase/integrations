# @browserbasehq/openclaw-browserbase

Browserbase plugin for OpenClaw (with legacy ClawdBot compatibility).

It provides:

- interactive Browserbase credential setup,
- config status/env helpers,
- dynamic skill sync from `github:browserbase/skills`.

## Install

```bash
openclaw plugins install @browserbasehq/openclaw-browserbase
```

For local development:

```bash
openclaw plugins install -l .
```

## Setup

```bash
openclaw browserbase setup
```

By default setup will also sync Browserbase skills from `browserbase/skills` into
`~/.openclaw/skills`.

You can manage skill sync directly:

```bash
openclaw browserbase skills status
openclaw browserbase skills sync
openclaw browserbase skills sync --ref main
openclaw browserbase skills sync --dir ~/.openclaw/skills
```

## Commands

```bash
openclaw browserbase setup                     # prompt for API key + project ID
openclaw browserbase status                    # show configuration status
openclaw browserbase status --json             # machine-readable status
openclaw browserbase env --format shell        # export commands
openclaw browserbase env --format dotenv       # dotenv output
openclaw browserbase env --format json         # JSON output
openclaw browserbase where                     # config file path used
openclaw browserbase skills status             # check dynamic skills sync status
openclaw browserbase skills sync               # download/update skills from browserbase/skills
```

Legacy CLI alias support remains:

```bash
clawdbot browserbase setup
```

## Dynamic skills behavior

OpenClaw installs plugins with lifecycle scripts disabled, so plugin install hooks are not a reliable place to fetch remote skill files.

This plugin instead syncs skills during setup and (optionally) on startup when missing:

- `browser-automation`
- `functions`

Source of truth: [https://github.com/browserbase/skills](https://github.com/browserbase/skills)

## Development

```bash
pnpm install
pnpm run check-types
pnpm test
```

## References

- OpenClaw Skills: https://docs.openclaw.ai/tools/skills
- OpenClaw Skills Config: https://docs.openclaw.ai/tools/skills-config
- OpenClaw Plugin System: https://docs.openclaw.ai/tools/plugin
- OpenClaw Plugin Manifest: https://docs.openclaw.ai/plugins/manifest
- Browserbase skills reference: https://github.com/browserbase/skills
- Example plugin reference: https://github.com/pepicrft/clawd-plugin-ralph
