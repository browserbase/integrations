# Vercel AI SDK + Stagehand code mode

This binding hosts `StagehandCodeExecutor` directly in the agent process and exposes it as one AI
SDK tool. It does not launch MCP because the AI SDK already has a native tool contract.

The agent receives the shared Stagehand V4 syntax skill through `system`, while the tool description
contains the same reference for tool-level context. One binding instance must be reused for the
whole `generateText` call and closed afterward.

See [`src/agent.ts`](./src/agent.ts).
