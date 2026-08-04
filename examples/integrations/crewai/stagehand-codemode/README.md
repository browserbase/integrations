# CrewAI + Stagehand code mode

CrewAI's native `MCPServerStdio` launches the local MCP beside the agent. One server configuration is
attached to the `Agent` for the whole `kickoff` run, allowing repeated `code_execute` calls to reuse
the same browser. CrewAI cleans up the MCP client after agent execution.

The shared Stagehand V4 syntax skill is placed in the agent's `backstory` and is also included in the
tool description discovered from MCP.

See [`agent.py`](./agent.py).
