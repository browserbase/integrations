from __future__ import annotations

import os

os.environ.setdefault("OPENAI_API_KEY", "discovery-only-placeholder")

from agent import STAGEHAND_CODEMODE_SKILL, build_stagehand_agent  # noqa: E402


def main() -> None:
    agent = build_stagehand_agent("openai/gpt-4o-mini")
    try:
        tools = agent.get_mcp_tools(agent.mcps or [])
        names = [getattr(tool, "original_tool_name", tool.name) for tool in tools]
        assert names == ["code_execute"]
        assert "Stagehand V4 code-mode syntax" in tools[0].description
        assert "stagehand.extract" in STAGEHAND_CODEMODE_SKILL
        print("CrewAI MCPServerStdio discovery PASS: code_execute")
    finally:
        agent._cleanup_mcp_clients()


if __name__ == "__main__":
    main()
