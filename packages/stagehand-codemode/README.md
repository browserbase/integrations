# Stagehand code mode

This private spike exposes one `code_execute` tool through a local MCP server over stdio for
frameworks with local-process MCP support.

The first tool call lazily creates one Browserbase browser. Calls are serialized and reuse that
browser until the owning process closes. The model writes an async JavaScript function body with
`page`, `context`, `stagehand`, `z`, and `console` already in scope.

`page`, `context`, and `stagehand` are the public V4 SDK objects, which already route their methods
over the extension's JSON-RPC protocol. The executor does not expose raw JSON-RPC or maintain a
second method allowlist that can drift from the SDK.

[`STAGEHAND_CODEMODE_SKILL.md`](./STAGEHAND_CODEMODE_SKILL.md) is the canonical syntax reference.
The MCP server includes it in the tool description so the model does not need to infer the V4 API.

```json
{
  "code": "await page.goto('https://example.com'); return { title: await page.title() };",
  "timeout_ms": 120000
}
```

## Trust boundary

The executor runs model-authored JavaScript in a child process so a timeout can terminate a hung
snippet. That process boundary is lifecycle containment, not a security sandbox: code can still
access the local filesystem, network, and in-process SDK state with the permissions of the parent
process. Only use this with trusted agents in a trusted local environment.

Secrets are not copied into the child process environment, reducing accidental exposure through
`process.env`. Browserbase and model configuration is sent over the private parent-child IPC channel,
but this is defense in depth rather than secret isolation because the snippet shares a process with
the configured SDK. A timeout or abort kills the child, requests release of its Browserbase session,
and returns `browser_state: "discarded"`; the next call starts fresh.

## Local stdio MCP

Build the package, then configure the framework to launch:

```text
node packages/stagehand-codemode/dist/cli.js
```

Set `BROWSERBASE_API_KEY` in the parent framework's environment. Stagehand V4 is an optional peer
dependency until V4 is published, so local development must make a V4 build resolvable as
`@browserbasehq/stagehand`.
