# Mastra + Stagehand code mode

Mastra launches the local stdio MCP through one long-lived `MCPClient`. The same client must remain
connected for the complete agent run so all `code_execute` calls reach the same browser-owning
process. `disconnect()` closes the process and browser afterward.

The shared Stagehand V4 syntax skill is supplied as the agent's `instructions` and is also present
in the discovered tool description.

See [`src/agent.ts`](./src/agent.ts). `pnpm smoke` performs real stdio MCP discovery without creating
a browser.
