from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from typing import Any

from deepagents import FilesystemPermission, create_deep_agent
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver

from subagents import (
    ASSIGNMENT_OWNERSHIP,
    GRANTED_PATENTS,
    INVENTOR_NETWORK,
    LITIGATION_HISTORY,
    PATENT_FAMILY_ANALYSIS,
    PROSECUTION_HISTORY,
)
from tools import patent_research


SYSTEM_PROMPT = """You are a patent landscape research orchestrator.

Given a technology area or assignee name (and optionally a seed patent number),
produce a structured patent landscape memo in three phases.

Start by writing ./reports/research-plan.md with your todo list for this run.

Phase 1 — fan out all five specialist subagents in parallel:
- granted-patents: search USPTO, EPO Espacenet, and WIPO Patentscope for relevant patents.
- prosecution-history: pull file wrapper data for top patents from USPTO Patent Center.
- assignment-ownership: trace assignment chains via USPTO Patent Assignment and EPO Register.
- litigation-history: search PTAB for IPR/PGR proceedings and outcomes.
- inventor-network: map inventors across their full portfolios and current affiliations.

Each subagent writes its workpaper to ./reports/<track>.md.

Phase 2 — per-family deep dives:
- Read the granted-patents workpaper to identify the top 3–5 high-priority patent families.
- For each family, delegate to the patent-family-analysis subagent to walk the full family tree
  (continuations, divisionals, foreign equivalents, PCT national phase entries).
- Each analysis is written to ./reports/family-<patent_number>.md.

Phase 3 — synthesis:
- Read all workpapers from ./reports/ using read_file.
- Cross-reference ownership (assignment-ownership) with litigation risk (litigation-history).
- Surface freedom-to-operate flags based on lapsed or un-entered foreign equivalents.
- Write the final memo to ./reports/final-memo.md with the structure below.

Final memo structure (./reports/final-memo.md):
1. Executive Summary (3–5 bullet points: landscape overview, top risks, FTO flags)
2. Landscape Overview — one section per Phase 1 track with key findings
3. Per-Family Deep Dives — one subsection per family with the family tree
4. Ownership & Litigation Cross-Reference — table of patents × PTAB proceedings × current owner
5. Freedom-to-Operate Flags — jurisdictions with lapsed or unprotected coverage
6. Sources Appendix — all Browserbase session replay URLs from patent_research calls
"""


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def build_model(model: str) -> ChatOpenAI:
    # OpenAI is the single model provider — no gateway, no fallback.
    return ChatOpenAI(
        model=model,
        api_key=_require_env("OPENAI_API_KEY"),
    )


def build_agent(model: str):
    os.makedirs("./reports", exist_ok=True)
    return create_deep_agent(
        model=build_model(model),
        tools=[patent_research],
        subagents=[
            GRANTED_PATENTS,
            PROSECUTION_HISTORY,
            ASSIGNMENT_OWNERSHIP,
            LITIGATION_HISTORY,
            INVENTOR_NETWORK,
            PATENT_FAMILY_ANALYSIS,
        ],
        system_prompt=SYSTEM_PROMPT,
        permissions=[FilesystemPermission(operations=["read", "write"], paths=[os.path.abspath("./reports")])],
        checkpointer=MemorySaver(),
    )


def _stringify_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                if item.get("type") == "text":
                    parts.append(str(item.get("text", "")))
                else:
                    parts.append(json.dumps(item, default=str))
            else:
                parts.append(str(item))
        return "\n".join(part for part in parts if part)
    return json.dumps(content, indent=2, default=str)


def _final_text(result: Any) -> str:
    state = getattr(result, "value", result)
    if isinstance(state, dict):
        messages = state.get("messages", [])
        for message in reversed(messages):
            msg_type = getattr(message, "type", None)
            if msg_type is None and isinstance(message, dict):
                msg_type = message.get("type") or message.get("role")
            if msg_type in {"ai", "assistant"}:
                content = getattr(message, "content", None)
                if content is None and isinstance(message, dict):
                    content = message.get("content")
                return _stringify_content(content)
        return json.dumps(state, indent=2, default=str)
    return str(state)


def run(query: str, model: str) -> str:
    agent = build_agent(model=model)
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    result = agent.invoke(
        {"messages": [{"role": "user", "content": query}]},
        config=config,
        version="v2",
    )
    memo = _final_text(result)
    memo_path = os.path.join(os.path.abspath("./reports"), "final-memo.md")
    with open(memo_path, "w", encoding="utf-8") as f:
        f.write(memo)
    print(f"Memo saved to {memo_path}", file=sys.stderr)
    return memo


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Patent landscape research agent powered by LangChain Deep Agents, "
            "Stagehand, and Browserbase. Writes a structured memo to ./reports/final-memo.md."
        )
    )
    parser.add_argument(
        "query",
        nargs="?",
        default=(
            "PageRank web search ranking algorithm — Stanford University / Google, "
            "seed patent US6285999"
        ),
        help="Technology area, assignee name, or seed patent number to research.",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("PATENT_AGENT_MODEL", "gpt-4.1"),
        help="OpenAI model for the orchestrator (default: gpt-4.1).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    load_dotenv()
    args = parse_args()
    print(run(query=args.query, model=args.model))
