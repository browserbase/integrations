# LangChain Deep Agents + Stagehand code mode

This binding launches the local MCP over stdio and keeps one explicit LangChain MCP session open
around the complete Deep Agent invocation.

Do not replace the explicit `client.session()` plus `load_mcp_tools(session)` flow with
`client.get_tools()`. LangChain documents that `get_tools()` creates a new session for each tool
call; for a stdio server, that means a new process and a new browser every time.

The shared Stagehand V4 syntax skill is loaded as the Deep Agent's `system_prompt` and is also
included in the MCP tool description.

See [`agent.py`](./agent.py).
