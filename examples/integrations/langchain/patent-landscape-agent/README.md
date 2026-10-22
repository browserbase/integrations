# Patent Landscape Agent (LangChain Deep Agents + Stagehand + Browserbase)

Runs a three-phase patent landscape research workflow given a technology area or assignee name.
Phase 1 fans out five specialist subagents in parallel (granted patents, prosecution history,
assignment/ownership, PTAB litigation, inventor network) across USPTO, EPO, and WIPO public portals.
Phase 2 walks the full family tree for each high-priority patent family. Phase 3 synthesizes
all findings into a structured memo at `./reports/final-memo.md` with a freedom-to-operate
assessment and a sources appendix of Browserbase session replay URLs.

Uses **OpenAI as the single model provider** for both the Deep Agents orchestrator and all
Stagehand browser-agent sessions — no other provider keys are required.

## Prerequisites

- Python 3.11+
- [Browserbase account](https://browserbase.com) — for headless browser sessions and Agent Identity
- OpenAI API key — for orchestration and Stagehand browser reasoning
- `BROWSERBASE_PROJECT_ID` is optional; set it to scope sessions to a specific Browserbase project

## Install

```bash
cd examples/integrations/langchain/patent-landscape-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Or with `uv`:

```bash
uv venv && uv pip install -r requirements.txt
```

## Environment

```bash
cp .env.example .env
```

Edit `.env`:

```ini
OPENAI_API_KEY=sk-...
BROWSERBASE_API_KEY=bb_...
# BROWSERBASE_PROJECT_ID=prj_...  # optional; scopes sessions to a specific project
```

## Run

Default (PageRank benchmark):

```bash
python agent.py
```

Custom query:

```bash
python agent.py "MapReduce distributed computing — Google (Jeffrey Dean, Sanjay Ghemawat) US7650331"
python agent.py "Transformer attention mechanism — Google Brain, US10452978"
python agent.py "US6285999"   # single seed patent, walks the full family
```

Override the orchestrator model:

```bash
python agent.py --model gpt-4.1 "US6285999"
```

The final memo is always written to `./reports/final-memo.md` when the run completes.
Intermediate workpapers may also appear there if the orchestrator uses the filesystem tools
during the run.

## Streaming subagent activity

`create_deep_agent` returns a LangGraph compiled graph. To stream token-level output:

```python
from agent import build_agent

agent = build_agent(model="gpt-4.1")
config = {"configurable": {"thread_id": "stream-demo"}}

for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "PageRank web search ranking — Stanford/Google US6285999"}]},
    config=config,
    version="v2",
    stream_mode="updates",
):
    print(chunk)
```

## Session replays

Every `patent_research` call opens a Browserbase browser session. The tool response includes a
`session_url` field of the form `https://browserbase.com/sessions/<id>`. These URLs are collected
in the final memo's Sources Appendix and are accessible in the Browserbase dashboard for up to
7 days after the run.

## Architecture

```
agent.py                     orchestrator (gpt-4.1, OpenAI)
├── tools/patent_research.py  single tool: Stagehand agent over a Browserbase session
└── subagents/
    ├── granted_patents.py     USPTO search, EPO Espacenet, WIPO Patentscope
    ├── prosecution_history.py USPTO Patent Center file wrappers
    ├── assignment_ownership.py USPTO Assignment Search, EPO Register
    ├── litigation_history.py  USPTO PTAB (IPR/PGR proceedings)
    ├── inventor_network.py    inventor portfolio mapping
    └── patent_family_analysis.py  continuations, divisionals, foreign equivalents
```

All browser interactions go through the `patent_research` tool, which creates a Browserbase
session per call, drives the portal with a Stagehand agent configured to use `openai/gpt-4o`,
and returns structured JSON with the extracted data and a session replay URL.

## Benchmark: PageRank (Stanford / Google)

**Query**: `"PageRank web search ranking algorithm — Stanford University / Google, seed patent US6285999"`

- Seed patent: US6285999B1 (filed Jan 9, 1998 — Lawrence Page, Stanford University assignee)
- Licensed exclusively to Google; multiple US continuations filed through the 2000s
- EPO equivalent: EP1062579; also filed in Canada, Japan, and Australia
- Went through USPTO ex parte reexamination (reexam cert issued 2011)

Well-known to software engineers, publicly well-documented, and a clean example of a
university-originated patent licensed to a commercial entity with a traceable family tree.

Expected output:

```markdown
# Patent Landscape Memo: PageRank (Stanford / Google)

## Executive Summary
- US6285999 is the anchor; Stanford filed ~6 US continuations, all assigned to Google
  via exclusive license executed in 1998.
- EPO EP1062579 granted; CA, JP, AU national phase entries confirmed.
- No active PTAB proceedings; ex parte reexamination closed 2011 with amended claims.
- Patent expired Jan 9, 2018 (20-year term from priority date) — no remaining FTO risk
  on the core PageRank claims. Continuation US7058628 expired 2019.
- Inventor network: Lawrence Page and Sergey Brin; subsequent Stanford/Google filing
  activity visible via inventor search.

## Landscape Overview
...
```

Typical run stats: ~14 `patent_research` calls, 6 subagent invocations, ~30 min total runtime,
~150k input tokens.

## Notes

- All portals accessed are public (no login required). USPTO PTAB, Patent Center, and Assignment
  Search, EPO Espacenet and Register, and WIPO Patentscope are fully public.
- Browserbase Agent Identity handles browser fingerprinting and CAPTCHAs automatically.
- `previous_session_id` in `patent_research` allows a subagent to issue follow-up queries on
  the same portal page without starting a new session (e.g., paginating through search results).
- Workpapers in `./reports/` are plain markdown. The directory is gitignored; commit selectively
  if you want to version specific memos.
