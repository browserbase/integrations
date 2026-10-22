from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any

from browserbase import Browserbase
from bs4 import BeautifulSoup
from langchain.tools import tool
from stagehand import AsyncStagehand

DEFAULT_STAGEHAND_MODEL = os.getenv(
    "STAGEHAND_MODEL",
    "google/gemini-3-flash-preview",
)
DEFAULT_STAGEHAND_AGENT_MODEL = os.getenv(
    "STAGEHAND_AGENT_MODEL",
    "anthropic/claude-sonnet-4-6",
)


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _browserbase_client() -> Browserbase:
    return Browserbase(api_key=_require_env("BROWSERBASE_API_KEY"))


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


def _html_to_text(html: str, max_chars: int) -> tuple[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    body = soup.body or soup
    text = body.get_text("\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return title, text[:max_chars]


def _stagehand_client() -> AsyncStagehand:
    return AsyncStagehand(
        browserbase_api_key=_require_env("BROWSERBASE_API_KEY"),
    )


def _run_async(coro: Any) -> Any:
    return asyncio.run(coro)


@tool
def kyc_search(query: str, num_results: int = 5) -> str:
    """Search the web with Browserbase. Use first for discovery before opening portals or pages."""
    bb = _browserbase_client()
    response = bb.search.web(query=query, num_results=max(1, min(num_results, 10)))
    results = []
    for result in getattr(response, "results", []):
        results.append(
            {
                "title": getattr(result, "title", ""),
                "url": getattr(result, "url", ""),
                "author": getattr(result, "author", None),
                "published_date": (
                    getattr(result, "published_date", None)
                    or getattr(result, "publishedDate", None)
                ),
            }
        )
    return _json(
        {
            "query": query,
            "request_id": getattr(response, "request_id", None)
            or getattr(response, "requestId", None),
            "results": results,
        }
    )


@tool
def kyc_fetch(url: str, use_proxy: bool = False, max_chars: int = 12000) -> str:
    """Fetch page content without a browser session. Best for static pages such as SEC EDGAR filings and public registries.

    Returns an error with a fallback instruction if the page exceeds 1MB — use kyc_extract_from_portal for those URLs instead.
    """
    bb = _browserbase_client()
    try:
        response = bb.fetch_api.create(url=url, proxies=use_proxy)
    except Exception as e:
        return _json({"error": str(e), "fallback": "Page too large for Fetch. Call kyc_extract_from_portal with this URL instead."})
    content = getattr(response, "content", "")
    content_type = (
        getattr(response, "content_type", None)
        or getattr(response, "contentType", "")
        or ""
    ).lower()

    title = ""
    text = str(content)[:max_chars]
    if "html" in content_type:
        title, text = _html_to_text(str(content), max_chars=max_chars)

    return _json(
        {
            "url": url,
            "status_code": getattr(response, "status_code", None)
            or getattr(response, "statusCode", None),
            "content_type": getattr(response, "content_type", None)
            or getattr(response, "contentType", None),
            "encoding": getattr(response, "encoding", None),
            "title": title,
            "text": text,
        }
    )


@tool
def kyc_extract_from_portal(start_url: str, instruction: str) -> str:
    """Open a Browserbase browser session and extract structured data from a rendered portal page using Stagehand.

    Use for read-only lookups on JavaScript-heavy registry portals, sanctions lists, and court record sites.
    The session_url in the response links to the Browserbase session replay.
    """
    return _run_async(_kyc_extract_from_portal_async(start_url=start_url, instruction=instruction))


async def _kyc_extract_from_portal_async(start_url: str, instruction: str) -> str:
    client = _stagehand_client()
    start_resp = await client.sessions.start(
        model_name=DEFAULT_STAGEHAND_MODEL,
    )
    session_id = start_resp.data.session_id

    try:
        await client.sessions.navigate(
            id=session_id,
            url=start_url,
            frame_id="",
        )
        result = await client.sessions.extract(
            id=session_id,
            instruction=instruction,
        )
        extracted = getattr(getattr(result, "data", None), "result", None)
        return _json(
            {
                "start_url": start_url,
                "session_id": session_id,
                "session_url": f"https://browserbase.com/sessions/{session_id}",
                "instruction": instruction,
                "result": _normalize(extracted),
            }
        )
    finally:
        await client.sessions.end(id=session_id)


@tool
def kyc_search_portal(start_url: str, task: str) -> str:
    """Open a Browserbase browser session and run a multi-step browser task on a portal using a Stagehand agent.

    Use for interactive lookups that require filling search forms, navigating paginated results, or
    submitting queries to gated portals (Secretary of State, FinCEN BOI, OFAC, PACER, EDGAR).
    Agent Identity handles anti-bot measures and CAPTCHAs automatically.
    The session_url in the response links to the Browserbase session replay.
    """
    return _run_async(_kyc_search_portal_async(start_url=start_url, task=task))


async def _kyc_search_portal_async(start_url: str, task: str) -> str:
    client = _stagehand_client()
    start_resp = await client.sessions.start(
        model_name=DEFAULT_STAGEHAND_AGENT_MODEL,
    )
    session_id = start_resp.data.session_id

    try:
        await client.sessions.navigate(
            id=session_id,
            url=start_url,
            frame_id="",
        )
        result = await client.sessions.execute(
            id=session_id,
            execute_options={
                "instruction": task,
                "max_steps": 25,
            },
            agent_config={
                "model": DEFAULT_STAGEHAND_AGENT_MODEL,
                "instructions": (
                    "You are executing a KYC lookup on behalf of a compliance agent. "
                    "Be precise, extract all relevant fields, and stop once the lookup is complete. "
                    "If a CAPTCHA or challenge appears, pause and report it."
                ),
            },
            timeout=300.0,
        )
        data = _normalize(result)
        if isinstance(data, dict):
            data["session_url"] = f"https://browserbase.com/sessions/{session_id}"
        return _json(data)
    finally:
        await client.sessions.end(id=session_id)
