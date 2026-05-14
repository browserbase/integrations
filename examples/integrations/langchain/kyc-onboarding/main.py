from __future__ import annotations

import argparse
import json
import os
import uuid
from typing import Any

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from langchain_openai import ChatOpenAI

from kyc_tools import (
    kyc_extract_from_portal,
    kyc_fetch,
    kyc_search,
    kyc_search_portal,
)


SYSTEM_PROMPT = """You are a KYC onboarding orchestrator. Given a company name and jurisdiction,
run a two-phase due diligence workflow and return a consolidated KYC report.

Phase 1 — fan out to all five specialist subagents in parallel:
- corporate-registry: verify legal existence, registered agent, filing status, and good standing.
- beneficial-ownership: identify ultimate beneficial owners (UBOs) and controlling persons.
- sanctions-pep: screen the entity against OFAC, EU, and UK sanctions lists and PEP registries.
- litigation-regulatory: search PACER, relevant state courts, and SEC EDGAR for material actions.
- adverse-media: search publisher news sites for negative coverage, fraud, or enforcement actions.

Phase 2 — individual KYC fan-out:
- Parse the beneficial-ownership report for each named individual owner.
- For each person, delegate to the individual-kyc subagent to run sanctions, PEP, and adverse-media checks.

Final output:
- Consolidated report with findings per track.
- Flag any hits, discrepancies, or items requiring manual review.
- Include session replay URLs from each browser session for audit purposes.
"""

_ALL_TOOLS = [kyc_search, kyc_fetch, kyc_extract_from_portal, kyc_search_portal]

CORPORATE_REGISTRY = {
    "name": "corporate-registry",
    "description": (
        "Verifies corporate legal existence, registered agent, filing status, and good standing "
        "via state Secretary of State portals and equivalent registries."
    ),
    "system_prompt": """You are a corporate registry specialist.

Your task: confirm the company's legal existence and standing in the given jurisdiction.

Target portals (select based on jurisdiction):
- Delaware: https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx
- California: https://bizfileonline.sos.ca.gov/search/business
- New York: https://apps.dos.ny.gov/publicInquiry/
- Federal (UK): https://find-and-update.company-information.service.gov.uk/

Steps:
1. Use kyc_search to locate the correct portal for the jurisdiction.
2. Use kyc_search_portal to search by company name and retrieve: entity type, status, formation date,
   registered agent name and address, and any recent filings.
3. Use kyc_extract_from_portal for read-only extraction on rendered results pages.

Return a structured report with all retrieved fields and the session replay URL for each session.
""",
    "tools": _ALL_TOOLS,
}

BENEFICIAL_OWNERSHIP = {
    "name": "beneficial-ownership",
    "description": (
        "Identifies ultimate beneficial owners (UBOs) and controlling persons via FinCEN BOI "
        "and jurisdiction-specific registries."
    ),
    "system_prompt": """You are a beneficial ownership specialist.

Your task: identify all ultimate beneficial owners (UBOs) and controlling persons for the entity.

Target portals:
- FinCEN BOI search (if available): https://boiefiling.fincen.gov/
- UK PSC register: https://find-and-update.company-information.service.gov.uk/
- EU registries vary by member state; use kyc_search to locate the correct portal.

Steps:
1. Search the FinCEN BOI system and any jurisdiction-specific beneficial ownership registry.
2. Extract each named individual: full name, ownership percentage, nature of control, nationality.
3. If the registry is not publicly searchable, note it explicitly in your report.

Return a structured list of beneficial owners with all available fields, plus session replay URLs.
This list will be used by the Phase 2 individual KYC fan-out.
""",
    "tools": _ALL_TOOLS,
}

SANCTIONS_PEP = {
    "name": "sanctions-pep",
    "description": (
        "Screens the entity against OFAC SDN, EU consolidated sanctions list, UK HMT financial "
        "sanctions list, and PEP registries."
    ),
    "system_prompt": """You are a sanctions and PEP screening specialist.

Your task: screen the company against all major sanctions and PEP lists.

Target portals:
- OFAC SDN: https://sanctionssearch.ofac.treas.gov/
- EU consolidated list: https://eeas.europa.eu/topics/sanctions-policy/8442/consolidated-list-sanctions_en
- UK HMT: https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets

Steps:
1. Search each portal by the exact company name and any known aliases or trading names.
2. Record: whether a match was found, match score or confidence, relevant list entry details,
   and the date of the check.
3. If no match is found, state that explicitly with the search terms used.

Return a per-list screening result with session replay URLs for audit evidence.
""",
    "tools": _ALL_TOOLS,
}

LITIGATION_REGULATORY = {
    "name": "litigation-regulatory",
    "description": (
        "Searches PACER, relevant state courts, and SEC EDGAR for material litigation, "
        "enforcement actions, and regulatory filings."
    ),
    "system_prompt": """You are a litigation and regulatory specialist.

Your task: identify material litigation, enforcement actions, and relevant regulatory filings.

Steps:

1. SEC EDGAR full-text search (JSON API — use kyc_fetch, not kyc_search_portal):
   Construct the URL by substituting the company name into the query parameter, e.g.:
   https://efts.sec.gov/LATEST/search-index?q=%22Stripe%2C+Inc.%22&dateRange=custom&startdt=2015-01-01
   Parse the JSON response for hits referencing legal proceedings, enforcement, or Wells notices.

2. SEC EDGAR company search (rendered page — use kyc_extract_from_portal):
   Construct the URL by substituting the company name, e.g.:
   https://www.sec.gov/cgi-bin/browse-edgar?company=Stripe&action=getcompany
   Extract any filings that reference legal proceedings (8-K Item 8.01, litigation releases).

3. PACER Case Locator (interactive portal — use kyc_search_portal):
   https://pcl.uscourts.gov/pcl/pages/search/findCase.jsf
   Search for federal civil and criminal cases naming the company as a party.

4. Use kyc_search to surface any publicly reported regulatory actions not captured above.

Summarize: case name, docket number, court, filing date, current status, and resolution if any.
Return findings with session replay URLs for each browser session.
""",
    "tools": _ALL_TOOLS,
}

ADVERSE_MEDIA = {
    "name": "adverse-media",
    "description": (
        "Searches publisher news sites for negative coverage, fraud allegations, enforcement actions, "
        "or reputational risk signals."
    ),
    "system_prompt": """You are an adverse media specialist.

Your task: identify negative news coverage that represents reputational or compliance risk.

Search targets (use kyc_search, then kyc_fetch or kyc_extract_from_portal for full articles):
- Reuters, Bloomberg, Financial Times, Wall Street Journal
- Regulatory and enforcement news sites (SEC.gov newsroom, FinCEN advisories, DOJ press releases)
- Industry-specific press

Search terms to use:
- "{company} fraud"
- "{company} enforcement"
- "{company} investigation"
- "{company} money laundering"
- "{company} sanctions"

Steps:
1. Run searches with each term combination.
2. For each hit, fetch the article and extract: headline, publication, date, summary of allegation,
   and outcome if known.
3. Distinguish confirmed findings from allegations.

Return a ranked list of adverse media findings by severity, with source URLs.
""",
    "tools": _ALL_TOOLS,
}

INDIVIDUAL_KYC = {
    "name": "individual-kyc",
    "description": (
        "Runs KYC checks on an individual beneficial owner: sanctions screening, PEP status, "
        "and adverse media search."
    ),
    "system_prompt": """You are an individual KYC specialist.

You will receive a person's name, nationality, and role. Run the following checks:

1. Sanctions screening:
   - OFAC SDN: https://sanctionssearch.ofac.treas.gov/
   - EU consolidated list: https://eeas.europa.eu/topics/sanctions-policy/8442/consolidated-list-sanctions_en
   - UK HMT: https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets

2. PEP screening:
   - Use kyc_search for "{name} politically exposed person" and "{name} government official".

3. Adverse media:
   - Search for "{name} fraud", "{name} investigation", "{name} enforcement".

Return a structured report with: name, role, sanctions result (match/no-match per list),
PEP status, adverse media hits, and session replay URLs for each browser session.
""",
    "tools": _ALL_TOOLS,
}


def _normalize_chat_model_name(model: str) -> str:
    if ":" in model:
        provider, raw_model = model.split(":", 1)
        if provider == "openai":
            return raw_model
    return model


def build_model(model: str) -> ChatOpenAI:
    base_url = os.getenv("DEEPAGENT_BASE_URL") or os.getenv("OPENAI_BASE_URL")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    browserbase_api_key = os.getenv("BROWSERBASE_API_KEY")

    if openai_api_key:
        api_key = openai_api_key
    elif browserbase_api_key and base_url:
        api_key = browserbase_api_key
    else:
        raise ValueError(
            "Missing Deep Agent model configuration. Set OPENAI_API_KEY for direct OpenAI access, "
            "or set BROWSERBASE_API_KEY together with DEEPAGENT_BASE_URL/OPENAI_BASE_URL for a "
            "Browserbase-backed OpenAI-compatible gateway."
        )

    kwargs: dict[str, Any] = {
        "model": _normalize_chat_model_name(model),
        "api_key": api_key,
    }
    if base_url:
        kwargs["base_url"] = base_url
    return ChatOpenAI(**kwargs)


def build_agent(model: str):
    return create_deep_agent(
        model=build_model(model),
        tools=[kyc_search, kyc_fetch],
        subagents=[
            CORPORATE_REGISTRY,
            BENEFICIAL_OWNERSHIP,
            SANCTIONS_PEP,
            LITIGATION_REGULATORY,
            ADVERSE_MEDIA,
            INDIVIDUAL_KYC,
        ],
        system_prompt=SYSTEM_PROMPT,
        interrupt_on={
            "kyc_search_portal": {
                "allowed_decisions": ["approve", "edit", "reject"]
            }
        },
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


def _collect_decisions(interrupt_value: Any) -> list[dict[str, Any]]:
    action_requests = interrupt_value["action_requests"]
    review_configs = interrupt_value["review_configs"]
    config_by_name = {config["action_name"]: config for config in review_configs}
    decisions: list[dict[str, Any]] = []

    for action in action_requests:
        review = config_by_name[action["name"]]
        allowed = review["allowed_decisions"]

        print("\nPending tool call")
        print(f"Tool: {action['name']}")
        print("Arguments:")
        print(json.dumps(action["args"], indent=2, default=str))
        print(f"Allowed decisions: {', '.join(allowed)}")

        while True:
            raw = input("Decision [approve/edit/reject]: ").strip().lower()
            if raw in allowed:
                if raw == "approve":
                    decisions.append({"type": "approve"})
                    break
                if raw == "reject":
                    decisions.append({"type": "reject"})
                    break

                edited = input("Enter replacement JSON args: ").strip()
                try:
                    edited_args = json.loads(edited)
                except json.JSONDecodeError:
                    print("Invalid JSON. Try again.")
                    continue
                decisions.append(
                    {
                        "type": "edit",
                        "edited_action": {
                            "name": action["name"],
                            "args": edited_args,
                        },
                    }
                )
                break

            print("Invalid decision for this tool call.")

    return decisions


def _review_actions(result: Any) -> Any:
    interrupts = result.interrupts
    if len(interrupts) == 1:
        return {"decisions": _collect_decisions(interrupts[0].value)}
    # Multiple concurrent interrupts — LangGraph requires keying resume by interrupt id.
    return {
        interrupt.id: {"decisions": _collect_decisions(interrupt.value)}
        for interrupt in interrupts
    }


def run(company: str, jurisdiction: str, model: str) -> str:
    agent = build_agent(model=model)
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    query = f"Run a full KYC check on {company!r} incorporated in {jurisdiction}."
    result = agent.invoke(
        {"messages": [{"role": "user", "content": query}]},
        config=config,
        version="v2",
    )

    while result.interrupts:
        result = agent.invoke(
            Command(resume=_review_actions(result)),
            config=config,
            version="v2",
        )

    return _final_text(result)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="KYC onboarding agent powered by LangChain Deep Agents, Stagehand, and Browserbase."
    )
    parser.add_argument(
        "company",
        nargs="?",
        default="Acme Corp Inc.",
        help="Full legal name of the company to screen (default: 'Acme Corp Inc.')",
    )
    parser.add_argument(
        "--jurisdiction",
        default="Delaware",
        help="Incorporation jurisdiction (default: Delaware)",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("DEEPAGENT_MODEL", "gpt-5.4"),
        help="Deep Agents model name.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    load_dotenv()
    args = parse_args()
    print(run(company=args.company, jurisdiction=args.jurisdiction, model=args.model))
