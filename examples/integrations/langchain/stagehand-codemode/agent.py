from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from deepagents import create_deep_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
CLI_PATH = REPOSITORY_ROOT / "packages/stagehand-codemode/dist/cli.js"
SKILL_PATH = REPOSITORY_ROOT / "packages/stagehand-codemode/STAGEHAND_CODEMODE_SKILL.md"
STAGEHAND_CODEMODE_SKILL = SKILL_PATH.read_text().strip()


async def run_stagehand_agent(prompt: str, model: str | Any = "openai:gpt-5-mini") -> dict[str, Any]:
    client = MultiServerMCPClient(
        {
            "stagehand": {
                "transport": "stdio",
                "command": "node",
                "args": [str(CLI_PATH)],
                "env": dict(os.environ),
            }
        },
        tool_name_prefix=False,
        handle_tool_errors=True,
    )

    # An explicit session is required. client.get_tools() would start a fresh stdio
    # process for each tool call and lose the browser between calls.
    async with client.session("stagehand") as session:
        tools = await load_mcp_tools(session)
        code_tools = [tool for tool in tools if tool.name == "code_execute"]
        if len(code_tools) != 1:
            raise RuntimeError(f"Expected one code_execute tool, got {[tool.name for tool in tools]}")
        agent = create_deep_agent(
            model=model,
            tools=code_tools,
            system_prompt=STAGEHAND_CODEMODE_SKILL,
        )
        return await agent.ainvoke(
            {"messages": [{"role": "user", "content": prompt}]},
            config={"recursion_limit": 20},
        )
