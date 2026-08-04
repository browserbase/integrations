# Stagehand code mode

This private spike exposes one `code_execute` tool through a local MCP server over stdio for
frameworks with local-process MCP support.

The first tool call lazily creates one Browserbase browser. Calls are serialized and reuse that
browser until the owning process closes. The model writes an async JavaScript function body with
`page`, `context`, `stagehand`, `z`, and `console` already in scope.

`page`, `context`, and `stagehand` are the public V4 SDK objects, which already route their methods
over the extension's JSON-RPC protocol. The executor does not expose raw JSON-RPC or maintain a
second method allowlist that can drift from the SDK.

[`SKILL.md`](./SKILL.md) is the canonical syntax reference. The MCP server includes it in the tool
description so the model does not need to infer the V4 API.

```json
{
  "code": "await page.goto('https://example.com'); return { title: await page.title() };"
}
```

## Trust boundary

The executor runs model-authored JavaScript directly in the local MCP process. This is not a security
sandbox: code can access the local filesystem, network, environment, and in-process SDK state with
that process's permissions. Only use it with trusted agents in a trusted local environment.

The agent framework owns the stdio MCP process. If generated code stops responding, the framework
should terminate and restart the process. Restarting also starts a fresh browser, so the previous
browser state is lost. The tool intentionally does not add a second worker, IPC protocol, or timeout
supervisor around this local single-agent session.

## Local stdio MCP

Build the package, then configure the framework to launch:

```text
node packages/stagehand-codemode/dist/stdio-server.js
```

Set `BROWSERBASE_API_KEY` in the parent framework's environment. Stagehand V4 is an optional peer
dependency until V4 is published, so local development must make a V4 build resolvable as
`@browserbasehq/stagehand`.
