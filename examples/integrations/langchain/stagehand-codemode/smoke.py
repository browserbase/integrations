from __future__ import annotations

import asyncio

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools

from agent import CLI_PATH, STAGEHAND_CODEMODE_SKILL


async def main() -> None:
    client = MultiServerMCPClient(
        {
            "stagehand": {
                "transport": "stdio",
                "command": "node",
                "args": [str(CLI_PATH)],
            }
        }
    )
    async with client.session("stagehand") as session:
        tools = await load_mcp_tools(session)
        assert [tool.name for tool in tools] == ["code_execute"]
        assert "Stagehand V4 code-mode syntax" in (tools[0].description or "")
        assert "stagehand.extract" in STAGEHAND_CODEMODE_SKILL
        print("Deep Agents persistent stdio discovery PASS: code_execute")


if __name__ == "__main__":
    asyncio.run(main())
