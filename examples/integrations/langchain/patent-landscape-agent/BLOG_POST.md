# Building a Patent Landscape Agent with LangChain Deep Agents and Browserbase

Patent research is hard — even for trained professionals. The portals that hold the most authoritative data (USPTO Patent Public Search, PTAB, EPO Espacenet, WIPO Patentscope) were designed for expert users navigating dense forms with institutional knowledge. Sessions time out mid-search. Search forms require specific field combinations that aren't documented. Results arrive paginated across dozens of screens. CAPTCHAs appear mid-session. Some portals simply go offline for maintenance.

Now imagine writing a script to automate that.

This is the problem browser agents were made for. In this post, we'll walk through how we built a patent landscape research agent using LangChain Deep Agents for orchestration, Stagehand as the SDK for browser agents, and Browserbase for headless browser infrastructure. The agent navigates real patent portals — the same ones a patent attorney would use — fans out across five research tracks in parallel, and synthesizes findings into a structured memo with an audit trail of session replays.

## Why patent portals can't be handled by an API

Most research agents are built on search and fetch APIs. These work well for the parts of the web designed to be indexed: news articles, product pages, public APIs, documentation. But APIs see roughly 15% of the web. The other 85% — authenticated portals, JavaScript-rendered applications, gated government databases — requires a browser.

Patent portals sit firmly in that 85%. Consider what it takes to pull prosecution history from USPTO Patent Center: you navigate to the portal, enter a patent number, wait for the application to render, click through to the Image File Wrapper, select the document type, navigate pagination, and download each document. The portal uses JavaScript rendering throughout, enforces session state, and returns nothing meaningful to a raw HTTP fetch. Try to automate it naively and you get blocked immediately.

The same is true for PTAB proceedings, EPO Espacenet family searches, WIPO Patentscope PCT data, and USPTO Assignment Search. Each one has its own interaction model. Each one has anti-bot measures. Each one occasionally goes offline.

This is precisely where [Browserbase](https://browserbase.com) comes in. Its Agent Identity — built on strategic partnerships with Cloudflare and a dedicated research team — gets browser agents past the detection systems that block traditional automation. Stagehand, Browserbase's SDK for browser agents, replaces brittle CSS selectors with natural language instructions that adapt when pages change. Together, they give agents the ability to use the web the way a human expert would.

## What the agent does

The patent landscape agent takes a technology area, assignee name, or seed patent number and runs a three-phase research workflow:

**Phase 1 — parallel five-track research.** Five specialist subagents run concurrently, each responsible for one research track:

| Subagent | Portals |
|---|---|
| `granted-patents` | USPTO Patent Public Search, EPO Espacenet, WIPO Patentscope |
| `prosecution-history` | USPTO Patent Center (+ Google Patents fallback) |
| `assignment-ownership` | USPTO Patent Assignment Search, EPO Register |
| `litigation-history` | USPTO PTAB (+ Google Patents fallback) |
| `inventor-network` | USPTO search, EPO Espacenet |

**Phase 2 — per-family deep dives.** After Phase 1 completes, the orchestrator identifies the highest-priority patent families and dispatches a `patent-family-analysis` subagent for each one. This subagent traces the full family tree: parent applications, continuations, divisionals, and foreign equivalents across every jurisdiction.

**Phase 3 — synthesis.** The orchestrator reads all research workpapers, cross-references ownership with litigation risk, surfaces freedom-to-operate flags, and writes a final memo to `./reports/final-memo.md`.

Every browser session — every portal visit by every subagent — produces a Browserbase session replay URL that appears in the memo's sources appendix, providing a visual audit trail of exactly what the agent saw.

## Architecture

```
agent.py                           orchestrator (gpt-4.1, OpenAI)
├── tools/patent_research.py        single tool: Stagehand agent over Browserbase
└── subagents/
    ├── granted_patents.py           USPTO search, EPO Espacenet, WIPO
    ├── prosecution_history.py       USPTO Patent Center, Google Patents fallback
    ├── assignment_ownership.py      USPTO Assignments, EPO Register
    ├── litigation_history.py        USPTO PTAB, Google Patents fallback
    ├── inventor_network.py          inventor portfolio mapping
    └── patent_family_analysis.py    continuations, divisionals, foreign equivalents
```

The entire demo uses **OpenAI as the sole model provider** — one API key backs both the Deep Agents orchestrator (`gpt-4.1`) and all Stagehand browser sessions (`openai/gpt-4o`). No additional LLM provider keys are needed.

## The `patent_research` tool

All browser interactions go through a single LangChain tool: `patent_research`. It accepts the target portal by name, a natural-language task description, an output schema, and an optional session ID for follow-up queries on the same portal page.

```python
PORTAL_URLS: dict[str, str] = {
    "uspto_search":          "https://ppubs.uspto.gov/pubwebapp/",
    "uspto_patent_center":   "https://patentcenter.uspto.gov/",
    "uspto_assignments":     "https://assignment.uspto.gov/patent/index.html#/patent/search",
    "uspto_ptab":            "https://ptab.uspto.gov/",
    "epo_espacenet":         "https://worldwide.espacenet.com/",
    "epo_register":          "https://register.epo.org/",
    "wipo_patentscope":      "https://patentscope.wipo.int/search/en/search.jsf",
    "google_patents":        "https://patents.google.com/",   # fallback
}

@tool
def patent_research(
    portal: str,
    query: str,
    output_schema: str,
    previous_session_id: str = "",
) -> str:
    """Research patents on a specific public portal using a Stagehand browser agent."""
    return _run_async(
        _patent_research_async(portal, query, output_schema, previous_session_id or None)
    )
```

Under the hood, each call creates a Browserbase session, navigates to the portal, and hands control to a Stagehand agent configured with OpenAI:

```python
async def _patent_research_async(portal, query, output_schema, previous_session_id):
    client = AsyncStagehand(
        browserbase_api_key=_require_env("BROWSERBASE_API_KEY"),
        model_api_key=_require_env("OPENAI_API_KEY"),  # single provider
    )
    session_id = previous_session_id or (await client.sessions.start(
        model_name="openai/gpt-4o"
    )).data.session_id

    if not previous_session_id:
        await client.sessions.navigate(id=session_id, url=PORTAL_URLS[portal], frame_id="")

    result = await client.sessions.execute(
        id=session_id,
        execute_options={"instruction": f"{query}\n\nExtract: {output_schema}", "max_steps": 30},
        agent_config={
            "model": "openai/gpt-4o",
            "instructions": (
                "You are a patent research assistant performing read-only lookups "
                "on public patent databases. Extract all requested fields precisely."
            ),
        },
        timeout=300.0,
    )

    return _json({
        "portal": portal,
        "session_id": session_id,
        "session_url": f"https://browserbase.com/sessions/{session_id}",
        "result": _normalize(result),
    })
```

The `session_url` in every response links to a Browserbase session replay — a full visual recording of everything the agent did on that portal. These URLs flow into the final memo's sources appendix, giving you an unambiguous audit trail for every claim.

### Why not just use a search API?

It's worth being direct about this. For many research tasks, a search or fetch API is the right tool — faster and cheaper than spinning up a full browser session. But patent portals specifically block those approaches:

- **USPTO Patent Public Search** requires JavaScript rendering and form interaction to return search results
- **PTAB** uses session state that a stateless fetch can't establish
- **EPO Espacenet** family searches require navigating through multiple click sequences
- **WIPO Patentscope** uses JavaScript-rendered results that aren't in the page source

These portals weren't designed with machine access in mind. They were designed for human experts. That's exactly why a browser agent — something that interacts with the web the way a human does — is the right abstraction.

## Subagents: focused system prompts, shared tool

Each subagent is a dict following the Deep Agents convention: a name, description, system prompt, and tool list. All six share the same `patent_research` tool; what differs is the system prompt, which directs the subagent to specific portals and specifies what to extract.

Here's the litigation history subagent as an example:

```python
LITIGATION_HISTORY = {
    "name": "litigation-history",
    "description": (
        "Searches USPTO PTAB for IPR and PGR proceedings against the top patents. "
        "Identifies which patents have been challenged, the petitioner, and the outcome."
    ),
    "system_prompt": """You are a patent litigation specialist focused on PTAB proceedings.

Primary portal: uspto_ptab
Fallback portal: google_patents (use if PTAB portal is unavailable or returns no results)

For each patent, extract all IPR, PGR, CBM, and ex parte reexamination proceedings:
- Proceeding number, type, filing date, petitioner
- Institution decision: date and outcome (instituted / denied)
- Final written decision: date and outcome (claims cancelled / confirmed / mixed)
- Whether an appeal was filed

If the PTAB portal is inaccessible, switch to google_patents and search for the patent
number. Google Patents displays PTAB proceedings under the "Events" tab.
""",
    "tools": [patent_research],
}
```

The fallback to Google Patents matters in practice. Government portals go offline for maintenance, return blank pages under load, or block automated sessions intermittently. Building the fallback into the system prompt — rather than into the tool — keeps the tool simple and lets each subagent handle its own failure modes.

## The orchestrator

The orchestrator is created with `create_deep_agent`, wiring together all six subagents, the `patent_research` tool, and filesystem access for persisting workpapers:

```python
def build_agent(model: str):
    os.makedirs("./reports", exist_ok=True)
    return create_deep_agent(
        model=ChatOpenAI(model=model, api_key=_require_env("OPENAI_API_KEY")),
        tools=[patent_research],
        subagents=[
            GRANTED_PATENTS, PROSECUTION_HISTORY, ASSIGNMENT_OWNERSHIP,
            LITIGATION_HISTORY, INVENTOR_NETWORK, PATENT_FAMILY_ANALYSIS,
        ],
        system_prompt=SYSTEM_PROMPT,
        permissions=[FilesystemPermission(
            operations=["read", "write"],
            paths=[os.path.abspath("./reports")],
        )],
        checkpointer=MemorySaver(),
    )
```

`FilesystemPermission` restricts the agent's filesystem access to `./reports/`, where it writes workpapers and reads them during synthesis. The `permissions` parameter is propagated automatically to subagents by the Deep Agents framework — subagents can use the `write_file` tool that FilesystemMiddleware injects.

The system prompt lays out the three-phase plan:

```python
SYSTEM_PROMPT = """You are a patent landscape research orchestrator.

Start by writing ./reports/research-plan.md with your todo list for this run.

Phase 1 — fan out all five specialist subagents in parallel:
- granted-patents, prosecution-history, assignment-ownership,
  litigation-history, inventor-network

Each subagent writes its workpaper to ./reports/<track>.md.

Phase 2 — per-family deep dives:
- Read the granted-patents workpaper to identify top 3–5 priority families.
- For each family, delegate to patent-family-analysis.
- Each analysis is written to ./reports/family-<patent_number>.md.

Phase 3 — synthesis:
- Read all workpapers from ./reports/ using read_file.
- Cross-reference ownership with litigation risk.
- Surface FTO flags based on lapsed or un-entered foreign equivalents.
- Write the final memo to ./reports/final-memo.md.
"""
```

## Handling portal failures gracefully

One thing became immediately clear running this against real portals: USPTO Patent Center and PTAB go down more often than you'd expect. This isn't a bug in the agent — it's a property of the infrastructure it's navigating.

The agent handles this through subagent-level fallback instructions. When PTAB returns a blank page, the litigation subagent switches to Google Patents, which aggregates PTAB proceedings under each patent's "Events" tab. When Patent Center is unavailable, the prosecution subagent falls back to Google Patents' prosecution timeline.

This design keeps the `patent_research` tool stateless and general-purpose. Failure handling lives in the system prompt, where it's easy to read, adjust, and extend without touching the tool layer.

## Running the agent

Install, configure, and run:

```bash
cd examples/integrations/langchain/patent-landscape-agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add OPENAI_API_KEY and BROWSERBASE_API_KEY
```

Default run (PageRank benchmark):

```bash
python agent.py
```

Custom queries:

```bash
python agent.py "MapReduce distributed computing — Google, US7650331"
python agent.py "Transformer attention mechanism — Google Brain, US10452978"
python agent.py "US6285999"  # single seed patent
```

## Benchmark: PageRank (Stanford / Google, US6285999)

We validated the agent end-to-end on the PageRank patent family — a good benchmark because it's well-documented, has a traceable ownership chain (Stanford licensed exclusively to Google in 1998), includes EPO and PCT equivalents, and went through ex parte reexamination in 2011.

The agent's key findings:

```markdown
## Executive Summary

- US6285999B1 is the anchor; Stanford filed associated continuations assigned to
  Google via exclusive license executed in 1998 (Reel 009410, Frame 0460).
- EPO EP1062579 granted; CA, JP, AU national phase entries confirmed via WIPO Patentscope.
- Ex parte reexamination closed 2011; reexamination certificate issued with amended claims.
- No active PTAB proceedings found (IPR/PGR filing window closed; patent expired Jan 2018).
- Core PageRank claims expired January 9, 2018 (20-year term from US priority date).
  No remaining FTO risk on the core ranking algorithm claims.
- Inventor network: Lawrence Page (primary), Sergey Brin listed on related applications.
  Both inventors' subsequent filing activity visible at Google.

## FTO Flags

- Core US claims: EXPIRED — no FTO risk.
- EPO EP1062579: confirm lapse status manually via EPO Register (term-based expiry expected).
- PCT national phase countries where patent was NOT entered: potential open FTO jurisdictions.
```

Typical run: ~14 `patent_research` tool calls, 6 subagent invocations, ~30 minutes end-to-end.

## Session replays as audit evidence

Every `patent_research` call returns a `session_url` field pointing to the Browserbase session replay for that browser session. These URLs are aggregated in the final memo's sources appendix.

For patent due diligence specifically, this matters: if a human reviewer later questions whether a PTAB proceeding was found or a portal was actually searched, the session replay shows exactly what the agent saw — the same visual evidence a human researcher would provide in a work product note.

Replays are accessible in the Browserbase dashboard for 7 days after the run and can be shared directly with a URL.

## What this demonstrates

Patent portals are a useful stress test for browser agents because they concentrate every challenge at once: complex multi-step navigation, JavaScript rendering, bot detection, session state, CAPTCHA gates, and portals that go offline. If a browser agent framework can handle these portals reliably, it can handle most of the difficult parts of the web.

The key architectural decisions that make this work in practice:

1. **One tool, many portals.** A single `patent_research` tool handles all six patent databases. The portal name and query describe what to do; Stagehand figures out how to do it.
2. **Subagent-level fallbacks.** Portal failures are handled in system prompts, not in tool code. This keeps the tool general and the failure logic visible and editable.
3. **Session replay for every call.** Every browser session is recorded. The audit trail is automatic, not bolted on.
4. **One model provider.** A single `OPENAI_API_KEY` backs both orchestration and browser reasoning. No additional accounts or keys needed.

## Resources

- [Source code](https://github.com/browserbase/integrations/tree/main/examples/integrations/langchain/patent-landscape-agent)
- [Browserbase documentation](https://docs.browserbase.com)
- [Stagehand documentation](https://docs.stagehand.dev)
- [LangChain Deep Agents documentation](https://docs.browserbase.com/integrations/langchain/deepagents)
