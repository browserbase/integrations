from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from crewai import Agent
from crewai.mcp import MCPServerStdio


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
CLI_PATH = REPOSITORY_ROOT / "packages/stagehand-codemode/dist/cli.js"
SKILL_PATH = REPOSITORY_ROOT / "packages/stagehand-codemode/STAGEHAND_CODEMODE_SKILL.md"
STAGEHAND_CODEMODE_SKILL = SKILL_PATH.read_text().strip()


def build_stagehand_agent(llm: str | Any = "openai/gpt-5-mini") -> Agent:
    server = MCPServerStdio(
        command="node",
        args=[str(CLI_PATH)],
        env=dict(os.environ),
        tool_filter=lambda _context, tool: tool.get("name") == "code_execute",
    )
    return Agent(
        role="Stagehand browser agent",
        goal="Complete browser tasks by writing compact, correct Stagehand V4 JavaScript.",
        backstory=STAGEHAND_CODEMODE_SKILL,
        llm=llm,
        mcps=[server],
        max_iter=8,
        verbose=False,
    )


def run_stagehand_agent(prompt: str, llm: str | Any = "openai/gpt-5-mini") -> str:
    # CrewAI keeps this stdio server connected for the Agent.kickoff run and cleans
    # its MCP clients when agent execution finishes.
    return str(build_stagehand_agent(llm).kickoff(prompt))
