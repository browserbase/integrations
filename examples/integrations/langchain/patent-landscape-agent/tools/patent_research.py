from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from browserbase import Browserbase
from langchain.tools import tool
from stagehand import AsyncStagehand

# OpenAI is the single model provider for both Stagehand act/extract and agent execution.
# "openai/gpt-4.1" follows the Stagehand provider/model naming convention.
STAGEHAND_MODEL = os.getenv("STAGEHAND_MODEL", "openai/gpt-4o")

PORTAL_URLS: dict[str, str] = {
    "uspto_search": "https://ppubs.uspto.gov/pubwebapp/",
    "uspto_patent_center": "https://patentcenter.uspto.gov/",
    "uspto_assignments": "https://assignment.uspto.gov/patent/index.html#/patent/search",
    "uspto_ptab": "https://ptab.uspto.gov/",
    "epo_espacenet": "https://worldwide.espacenet.com/",
    "epo_register": "https://register.epo.org/",
    "wipo_patentscope": "https://patentscope.wipo.int/search/en/search.jsf",
    # Fallback for PTAB proceedings and prosecution history when USPTO portals are unavailable.
    "google_patents": "https://patents.google.com/",
}


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _normalize(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _normalize(val) for key, val in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_normalize(item) for item in value]
    if hasattr(value, "model_dump"):
        return _normalize(value.model_dump())
    if hasattr(value, "dict"):
        return _normalize(value.dict())
    if hasattr(value, "__dict__"):
        public = {
            key: val
            for key, val in vars(value).items()
            if not key.startswith("_") and not callable(val)
        }
        if public:
            return _normalize(public)
    return str(value)


def _json(value: Any) -> str:
    return json.dumps(_normalize(value), indent=2, default=str)


def _stagehand_client() -> AsyncStagehand:
    # model_api_key must be passed explicitly — Stagehand does not read it from env.
    kwargs: dict = {
        "browserbase_api_key": _require_env("BROWSERBASE_API_KEY"),
        "model_api_key": _require_env("OPENAI_API_KEY"),
    }
    project_id = os.getenv("BROWSERBASE_PROJECT_ID", "").strip()
    if project_id:
        kwargs["browserbase_project_id"] = project_id
    return AsyncStagehand(**kwargs)


def _run_async(coro: Any) -> Any:
    return asyncio.run(coro)


@tool
def patent_research(
    portal: str,
    query: str,
    output_schema: str,
    previous_session_id: str = "",
) -> str:
    """Research patents on a specific public portal using a Stagehand browser agent.

    Args:
        portal: Which portal to query. One of: uspto_search, uspto_patent_center,
            uspto_assignments, uspto_ptab, epo_espacenet, epo_register, wipo_patentscope.
        query: Natural-language description of what to find and extract.
        output_schema: JSON object describing the fields to extract (e.g.
            '{"patent_number": "string", "title": "string", "status": "string"}').
        previous_session_id: If set, attach to this existing Browserbase session instead
            of starting a new one (useful for follow-up queries on the same portal page).
            Leave empty to start a fresh session.

    Returns:
        JSON with keys: portal, session_id, session_url (Browserbase replay link),
        query, result (extracted structured data).
    """
    return _run_async(
        _patent_research_async(
            portal=portal,
            query=query,
            output_schema=output_schema,
            previous_session_id=previous_session_id or None,
        )
    )


async def _patent_research_async(
    portal: str,
    query: str,
    output_schema: str,
    previous_session_id: str | None,
) -> str:
    if portal not in PORTAL_URLS:
        return _json({
            "error": f"Unknown portal '{portal}'. Valid values: {list(PORTAL_URLS)}",
        })

    client = _stagehand_client()
    new_session = previous_session_id is None

    if new_session:
        start_resp = await client.sessions.start(model_name=STAGEHAND_MODEL)
        session_id = start_resp.data.session_id
    else:
        session_id = previous_session_id

    instruction = (
        f"{query}\n\n"
        f"Extract a JSON object matching this schema: {output_schema}"
    )

    try:
        if new_session:
            await client.sessions.navigate(
                id=session_id,
                url=PORTAL_URLS[portal],
                frame_id="",
            )

        result = await client.sessions.execute(
            id=session_id,
            execute_options={
                "instruction": instruction,
                "max_steps": 30,
            },
            agent_config={
                # OpenAI is the single model provider — same key, same model throughout.
                "model": STAGEHAND_MODEL,
                "instructions": (
                    "You are a patent research assistant performing read-only lookups "
                    "on public patent databases. Extract all requested fields precisely. "
                    "Do not submit forms that could alter data. Stop once the lookup is complete."
                ),
            },
            timeout=300.0,
        )
        data = _normalize(result)
        return _json({
            "portal": portal,
            "session_id": session_id,
            "session_url": f"https://browserbase.com/sessions/{session_id}",
            "query": query,
            "result": data,
        })
    finally:
        # Only end sessions we started; reused sessions are the caller's responsibility.
        if new_session:
            await client.sessions.end(id=session_id)
