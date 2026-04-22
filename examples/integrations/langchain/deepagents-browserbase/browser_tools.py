from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any

from bs4 import BeautifulSoup
import httpx
from langchain_core.tools import tool
from stagehand import Stagehand, StagehandConfig


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


def _browserbase_headers() -> dict[str, str]:
    return {
        "x-bb-api-key": _require_env("BROWSERBASE_API_KEY"),
        "Content-Type": "application/json",
    }


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


def _stagehand_client() -> Stagehand:
    _require_env("BROWSERBASE_API_KEY")
    return Stagehand()


def _stagehand_config(model_name: str) -> StagehandConfig:
    return StagehandConfig(
        env="BROWSERBASE",
        api_key=_require_env("BROWSERBASE_API_KEY"),
        project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
        model_name=model_name,
    )


def _session_id(response: Any) -> str:
    data = getattr(response, "data", None)
    session_id = getattr(data, "session_id", None) or getattr(response, "session_id", None)
    if not session_id:
        raise RuntimeError(f"Could not extract session id from Stagehand response: {_json(response)}")
    return session_id


def _extract_result_payload(result: Any) -> Any:
    data = getattr(result, "data", None)
    extracted = getattr(data, "result", None)
    if extracted is not None:
        return _normalize(extracted)
    return _normalize(result)


def _close_stagehand(client: Any) -> None:
    closer = getattr(client, "close", None)
    if callable(closer):
        closer()


def _run_async(coro: Any) -> Any:
    return asyncio.run(coro)


@tool
def browserbase_search(query: str, num_results: int = 5) -> str:
    """Search the web with Browserbase. Use this first for discovery before opening pages."""
    response = httpx.post(
        "https://api.browserbase.com/v1/search",
        headers=_browserbase_headers(),
        json={
            "query": query,
            "numResults": max(1, min(num_results, 10)),
        },
        timeout=30.0,
    )
    response.raise_for_status()
    payload = response.json()
    results = []
    for result in payload.get("results", []):
        results.append(
            {
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "author": result.get("author"),
                "published_date": result.get("publishedDate"),
            }
        )
    return _json(
        {
            "query": query,
            "request_id": payload.get("requestId"),
            "results": results,
        }
    )


@tool
def browserbase_fetch(url: str, use_proxy: bool = False, max_chars: int = 12000) -> str:
    """Fetch page content without a browser session. Best for static pages and quick reads."""
    response = httpx.post(
        "https://api.browserbase.com/v1/fetch",
        headers=_browserbase_headers(),
        json={
            "url": url,
            "proxies": use_proxy,
        },
        timeout=30.0,
    )
    response.raise_for_status()
    payload = response.json()
    content = payload.get("content", "")
    content_type = (payload.get("contentType", "") or "").lower()

    title = ""
    text = str(content)[:max_chars]
    if "html" in content_type:
        title, text = _html_to_text(str(content), max_chars=max_chars)

    return _json(
        {
            "url": url,
            "status_code": payload.get("statusCode"),
            "content_type": payload.get("contentType"),
            "encoding": payload.get("encoding"),
            "title": title,
            "text": text,
        }
    )


@tool
def browserbase_rendered_extract(start_url: str, instruction: str) -> str:
    """Open a full Browserbase browser session and extract rendered content from a page with Stagehand."""
    client = _stagehand_client()
    response = client.sessions.start(model_name=DEFAULT_STAGEHAND_MODEL)
    session_id = _session_id(response)

    try:
        client.sessions.navigate(id=session_id, url=start_url)
        result = client.sessions.extract(id=session_id, instruction=instruction)
        return _json(
            {
                "start_url": start_url,
                "session_id": session_id,
                "session_url": f"https://browserbase.com/sessions/{session_id}",
                "instruction": instruction,
                "result": _extract_result_payload(result),
            }
        )
    finally:
        try:
            client.sessions.end(id=session_id)
        finally:
            _close_stagehand(client)


@tool
def browserbase_interactive_task(start_url: str, task: str) -> str:
    """Open a Browserbase-hosted Stagehand session and let a Stagehand agent execute a multi-step browser task."""
    return _run_async(_browserbase_interactive_task_async(start_url=start_url, task=task))


async def _browserbase_interactive_task_async(start_url: str, task: str) -> str:
    config = _stagehand_config(model_name=DEFAULT_STAGEHAND_AGENT_MODEL)
    async with Stagehand(config) as stagehand:
        page = stagehand.page
        await page.goto(start_url)

        agent = stagehand.agent(
            model=DEFAULT_STAGEHAND_AGENT_MODEL,
            instructions=(
                "You are executing a browser task on behalf of a LangChain tool. "
                "Be precise, avoid unnecessary actions, and stop once the requested task is complete."
            ),
        )
        agent_result = await agent.execute(task)
        return _json(_normalize(agent_result))
